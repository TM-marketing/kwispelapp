import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Plus, Loader2, Trash2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import SymptomGoalSliders from "../components/goals/SymptomGoalSliders";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function BewerkSessie() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');
  const dogId = urlParams.get('dogId');
  
  const [error, setError] = useState(null);
  const initialized = useRef(false);

  const { data: session, isLoading: sessionLoading, error: sessionError } = useQuery({
    queryKey: ['session', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        throw new Error('Geen sessie ID opgegeven');
      }
      const sessions = await base44.entities.Session.list();
      const found = sessions.find(s => s.id === sessionId);
      if (!found) {
        throw new Error('Sessie niet gevonden');
      }
      return found;
    },
    enabled: !!sessionId,
    retry: 1,
  });

  const { data: snapshot, isLoading: snapshotLoading, error: snapshotError } = useQuery({
    queryKey: ['dogSnapshot', dogId || session?.dog_id],
    queryFn: async () => {
      const id = dogId || session?.dog_id;
      if (!id) {
        throw new Error('Geen hond ID beschikbaar');
      }
      const response = await base44.functions.invoke('getDogSnapshot', { dogId: id });
      if (!response?.data) {
        throw new Error('Geen data ontvangen van server');
      }
      return response.data;
    },
    enabled: !!(dogId || session?.dog_id),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const [formData, setFormData] = useState({
    dog_id: "",
    type: "opvolging",
    datum: "",
    locatie: "winkel",
    gewicht_kg: "",
    gewicht_notitie: "",
    symptoom_scores: {
      jeuk: 0,
      roodheid: 0,
      schilfers: 0,
      stoelgang: 0,
      gedrag: 0,
      energie: 0
    },
    voeding_huidige: "",
    voeding_aanpassingen: "",
    supplementen: [],
    huid_en_vacht_opmerking: "",
    andere_gezondheidsproblemen_opmerking: "",
    algemene_notities: "",
    evaluatie_vorig_advies: "",
    nieuw_advies: "",
    volgende_afspraak: "",
    status: "draft",
    expert_naam: ""
  });

  const [goalSettings, setGoalSettings] = useState({
    jeuk: { enabled: false, target: '3' },
    roodheid: { enabled: false, target: '3' },
    schilfers: { enabled: false, target: '3' },
    stoelgang: { enabled: false, target: '3' },
    gedrag: { enabled: false, target: '3' },
    energie: { enabled: false, target: '5' }
  });

  const [gewichtGoalEnabled, setGewichtGoalEnabled] = useState(false);
  const [gewichtGoalTarget, setGewichtGoalTarget] = useState('');

  useEffect(() => {
    if (initialized.current || !session || !snapshot) {
      return;
    }

    initialized.current = true;

    const loadData = async () => {
      try {
        const weights = await base44.entities.WeightMeasurement.list();
        const sessionWeight = weights.find(w => w.session_id === sessionId);
        
        const symptoomScoresFromSession = session.symptoom_scores || {
          jeuk: 0,
          roodheid: 0,
          schilfers: 0,
          stoelgang: 0,
          gedrag: 0,
          energie: 0
        };

        setFormData({
          ...session,
          datum: session.datum ? new Date(session.datum).toISOString().slice(0, 16) : "",
          gewicht_kg: sessionWeight?.gewicht_kg?.toString() || "",
          gewicht_notitie: sessionWeight?.opmerking || "",
          symptoom_scores: symptoomScoresFromSession,
          supplementen: session.supplementen || []
        });

        const activeGoals = snapshot.goals || [];
        if (activeGoals.length > 0) {
          const newGoalSettings = {
            jeuk: { enabled: false, target: '3' },
            roodheid: { enabled: false, target: '3' },
            schilfers: { enabled: false, target: '3' },
            stoelgang: { enabled: false, target: '3' },
            gedrag: { enabled: false, target: '3' },
            energie: { enabled: false, target: '5' }
          };
          
          activeGoals.forEach(goal => {
            if (goal.type === 'symptoom' && goal.symptom_key) {
              newGoalSettings[goal.symptom_key] = {
                enabled: true,
                target: goal.streef_waarde?.toString() || '3'
              };
            } else if (goal.type === 'gewicht') {
              setGewichtGoalEnabled(true);
              setGewichtGoalTarget(goal.streef_waarde?.toString() || '');
            }
          });
          setGoalSettings(newGoalSettings);
        }
      } catch (err) {
        console.error('Error loading session data:', err);
        setError('Fout bij laden van sessiegegevens: ' + err.message);
      }
    };

    loadData();
  }, [session, snapshot, sessionId]);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['clean']
    ],
  };

  const handleSymptoomScoreChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      symptoom_scores: {
        ...prev.symptoom_scores,
        [key]: value
      }
    }));
  };

  const handleGoalSettingChange = (key, field, value) => {
    setGoalSettings(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value
      }
    }));
  };

  const updateSessionMutation = useMutation({
    mutationFn: async (data) => {
      const filteredSupplements = data.supplementen?.filter(s => s.naam || s.dosering || s.doel) || [];
      
      const sessionWeightKg = data.gewicht_kg;
      const sessionWeightNotitie = data.gewicht_notitie;
      
      const sessionData = { 
        ...data, 
        supplementen: filteredSupplements,
        status: 'final'
      };
      delete sessionData.gewicht_kg;
      delete sessionData.gewicht_notitie;

      await base44.entities.Session.update(sessionId, sessionData);
      
      if (sessionWeightKg) {
        const weights = await base44.entities.WeightMeasurement.list();
        const existingWeight = weights.find(w => w.session_id === sessionId);
        
        if (existingWeight) {
          await base44.entities.WeightMeasurement.update(existingWeight.id, {
            gewicht_kg: parseFloat(sessionWeightKg),
            opmerking: sessionWeightNotitie || ""
          });
        } else {
          await base44.entities.WeightMeasurement.create({
            dog_id: data.dog_id,
            session_id: sessionId,
            datum: data.datum.split('T')[0],
            gewicht_kg: parseFloat(sessionWeightKg),
            bron: "expert",
            verified_by_expert: true,
            opmerking: sessionWeightNotitie || ""
          });
        }
      }

      for (const [symptomKey, settings] of Object.entries(goalSettings)) {
        const existingGoalForSymptom = snapshot?.goals?.find(g =>
          g.symptom_key === symptomKey && g.type === 'symptoom' && g.status === 'actief'
        );
        
        if (settings.enabled && settings.target) {
          const symptoomLabels = {
            jeuk: "Jeuk", roodheid: "Roodheid", schilfers: "Schilfers",
            stoelgang: "Stoelgang", gedrag: "Gedrag", energie: "Energie"
          };

          const targetValue = parseFloat(settings.target);
          if (isNaN(targetValue)) continue;

          const goalData = {
            dog_id: data.dog_id,
            type: "symptoom",
            symptom_key: symptomKey,
            doel_omschrijving: `${symptoomLabels[symptomKey]} verbeteren`,
            start_waarde: data.symptoom_scores[symptomKey],
            streef_waarde: targetValue,
            start_datum: data.datum.split('T')[0],
            created_in_session_id: sessionId,
            status: "actief",
            consecutive_success_count: 0
          };

          if (existingGoalForSymptom) {
            if (existingGoalForSymptom.streef_waarde !== targetValue) {
              await base44.entities.Goal.update(existingGoalForSymptom.id, {
                streef_waarde: targetValue,
              });
            }
          } else {
            await base44.entities.Goal.create(goalData);
          }
        }
      }

      const existingWeightGoal = snapshot?.goals?.find(g => g.type === 'gewicht' && g.status === 'actief');
      
      if (gewichtGoalEnabled && gewichtGoalTarget && sessionWeightKg) {
        const targetWeightValue = parseFloat(gewichtGoalTarget);
        if (!isNaN(targetWeightValue)) {
          const goalData = {
            dog_id: data.dog_id,
            type: "gewicht",
            doel_omschrijving: `Gewicht naar ${gewichtGoalTarget} kg`,
            start_waarde: parseFloat(sessionWeightKg),
            streef_waarde: targetWeightValue,
            start_datum: data.datum.split('T')[0],
            created_in_session_id: sessionId,
            status: "actief",
            consecutive_success_count: 0
          };

          if (existingWeightGoal) {
            if (existingWeightGoal.streef_waarde !== targetWeightValue) {
              await base44.entities.Goal.update(existingWeightGoal.id, {
                streef_waarde: targetWeightValue
              });
            }
          } else {
            await base44.entities.Goal.create(goalData);
          }
        }
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogSnapshot'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      navigate(createPageUrl("HondenProfiel", `id=${session.dog_id}`));
    },
    onError: (error) => {
      setError("Er is een fout opgetreden bij het opslaan van de sessie: " + error.message);
      console.error(error);
    }
  });

  const deleteSessionMutation = useMutation({
    mutationFn: async () => {
      const weights = await base44.entities.WeightMeasurement.list();
      const sessionWeights = weights.filter(w => w.session_id === sessionId);
      await Promise.all(sessionWeights.map(w => base44.entities.WeightMeasurement.delete(w.id)));
      
      await base44.entities.Session.delete(sessionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogSnapshot'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      navigate(createPageUrl("HondenProfiel", `id=${session.dog_id}`));
    },
    onError: (error) => {
      setError("Er is een fout opgetreden bij het verwijderen van de sessie: " + error.message);
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.datum) {
      setError("Vul de datum en tijd in.");
      return;
    }

    updateSessionMutation.mutate(formData);
  };

  const addSupplement = () => {
    setFormData(prev => ({
      ...prev,
      supplementen: [...(prev.supplementen || []), { naam: "", dosering: "", doel: "" }]
    }));
  };

  const updateSupplement = (index, field, value) => {
    const newSupplementen = [...(formData.supplementen || [])];
    newSupplementen[index][field] = value;
    setFormData({ ...formData, supplementen: newSupplementen });
  };

  const removeSupplement = (index) => {
    setFormData(prev => ({
      ...prev,
      supplementen: (prev.supplementen || []).filter((_, i) => i !== index)
    }));
  };

  if (sessionLoading || snapshotLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: 'var(--primary-blue)' }} />
            <p className="text-lg" style={{ color: 'var(--primary-blue)' }}>Sessie laden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (sessionError || snapshotError || !session || !snapshot) {
    const errorMsg = sessionError?.message || snapshotError?.message || 'Onbekende fout';
    console.error('BewerkSessie Error:', { sessionError, snapshotError, session, snapshot });
    
    return (
      <div className="max-w-5xl mx-auto p-6">
        <Card className="border-2 border-red-300">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-red-700 mb-2">Fout bij laden sessie</h2>
            <p className="text-gray-600 mb-4">{errorMsg}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate(createPageUrl("Dashboard"))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug naar Dashboard
              </Button>
              <Button
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ['session'] });
                  queryClient.invalidateQueries({ queryKey: ['dogSnapshot'] });
                }}
                variant="outline"
              >
                Opnieuw Proberen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!initialized.current) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: 'var(--primary-blue)' }} />
            <p className="text-lg" style={{ color: 'var(--primary-blue)' }}>Sessie voorbereiden...</p>
          </div>
        </div>
      </div>
    );
  }

  const dog = snapshot.dog;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(createPageUrl("HondenProfiel", `id=${session.dog_id}`))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug
          </Button>
          <div>
            <h1 className="kwiek-heading text-3xl">Sessie Bewerken</h1>
            <p className="text-gray-600 mt-1">Voor {dog.naam} - {format(new Date(session.datum), 'd MMMM yyyy', { locale: nl })}</p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="rounded-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Verwijder Sessie
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
              <AlertDialogDescription>
                Dit zal deze sessie en alle bijbehorende gewichtsmetingen permanent verwijderen. 
                Deze actie kan niet ongedaan worden gemaakt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteSessionMutation.mutate()}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteSessionMutation.isPending}
              >
                {deleteSessionMutation.isPending ? 'Verwijderen...' : 'Ja, verwijder'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Accordion 
          type="multiple" 
          defaultValue={["basis", "gewicht", "symptomen", "observaties", "voeding", "advies", "planning"]}
          className="space-y-4"
        >
          
          <AccordionItem value="basis" className="border-2 rounded-2xl bg-white" style={{ borderColor: 'var(--primary-pink)' }}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <span className="kwiek-heading text-xl">Sessie Informatie</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="datum">Datum & Tijd *</Label>
                  <Input
                    id="datum"
                    type="datetime-local"
                    value={formData.datum}
                    onChange={(e) => setFormData({ ...formData, datum: e.target.value })}
                    className="rounded-xl border-2"
                    style={{ borderColor: 'var(--primary-pink)' }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locatie">Locatie</Label>
                  <Select 
                    value={formData.locatie} 
                    onValueChange={(value) => setFormData({ ...formData, locatie: value })}
                  >
                    <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--primary-pink)' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="winkel">Winkel</SelectItem>
                      <SelectItem value="telefoon">Telefoon</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="thuisbezoek">Thuisbezoek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="gewicht" className="border-2 rounded-2xl bg-white" style={{ borderColor: 'var(--primary-pink)' }}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <span className="kwiek-heading text-xl">Gewichtsmeting</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gewicht_kg">Gewicht (kg)</Label>
                  <Input
                    id="gewicht_kg"
                    type="number"
                    step="0.1"
                    value={formData.gewicht_kg}
                    onChange={(e) => setFormData({ ...formData, gewicht_kg: e.target.value })}
                    className="rounded-xl border-2"
                    style={{ borderColor: 'var(--primary-pink)' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gewicht_notitie">Notitie</Label>
                  <Input
                    id="gewicht_notitie"
                    value={formData.gewicht_notitie}
                    onChange={(e) => setFormData({ ...formData, gewicht_notitie: e.target.value })}
                    className="rounded-xl border-2"
                    style={{ borderColor: 'var(--primary-pink)' }}
                    placeholder="Optionele notitie..."
                  />
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t-2 mt-4" style={{ borderColor: 'var(--primary-pink)' }}>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gewicht-goal"
                    checked={gewichtGoalEnabled}
                    onCheckedChange={setGewichtGoalEnabled}
                  />
                  <Label htmlFor="gewicht-goal" className="cursor-pointer font-semibold">
                    Doel activeren voor gewicht
                  </Label>
                </div>
                {gewichtGoalEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="gewenst_gewicht">Gewenst gewicht (kg)</Label>
                    <Input
                      id="gewenst_gewicht"
                      type="number"
                      step="0.1"
                      value={gewichtGoalTarget}
                      onChange={(e) => setGewichtGoalTarget(e.target.value)}
                      className="rounded-xl border-2"
                      style={{ borderColor: 'var(--primary-pink)' }}
                      placeholder="Vul gewenst gewicht in..."
                    />
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="symptomen" className="border-2 rounded-2xl bg-white" style={{ borderColor: 'var(--primary-pink)' }}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <span className="kwiek-heading text-xl">Symptoomscores (0-10)</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <p className="text-sm text-gray-600 mt-2 mb-4">
                Vink "Maak doel" aan en vul een gewenste score in om deze als doel op te volgen.
              </p>
              <SymptomGoalSliders
                symptoomScores={formData.symptoom_scores}
                onSymptoomScoreChange={handleSymptoomScoreChange}
                goalSettings={goalSettings}
                onGoalSettingChange={handleGoalSettingChange}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="observaties" className="border-2 rounded-2xl bg-white" style={{ borderColor: 'var(--primary-pink)' }}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <span className="kwiek-heading text-xl">Observaties</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="huid_en_vacht_opmerking">Huid & Vacht</Label>
                  <ReactQuill
                    theme="snow"
                    value={formData.huid_en_vacht_opmerking || ''}
                    onChange={(value) => setFormData({ ...formData, huid_en_vacht_opmerking: value })}
                    modules={quillModules}
                    className="bg-white rounded-xl"
                    placeholder="Observaties m.b.t. huid en vacht..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="andere_gezondheidsproblemen_opmerking">Andere Gezondheidsproblemen</Label>
                  <ReactQuill
                    theme="snow"
                    value={formData.andere_gezondheidsproblemen_opmerking || ''}
                    onChange={(value) => setFormData({ ...formData, andere_gezondheidsproblemen_opmerking: value })}
                    modules={quillModules}
                    className="bg-white rounded-xl"
                    placeholder="Observaties m.b.t. stoelgang, spijsvertering, etc..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="algemene_notities">Algemene Notities</Label>
                  <ReactQuill
                    theme="snow"
                    value={formData.algemene_notities || ''}
                    onChange={(value) => setFormData({ ...formData, algemene_notities: value })}
                    modules={quillModules}
                    className="bg-white rounded-xl"
                    placeholder="Algemene observaties..."
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="voeding" className="border-2 rounded-2xl bg-white" style={{ borderColor: 'var(--primary-pink)' }}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <span className="kwiek-heading text-xl">Voeding</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voeding_aanpassingen">Voedingsaanpassingen & Advies</Label>
                  <ReactQuill
                    theme="snow"
                    value={formData.voeding_aanpassingen || ''}
                    onChange={(value) => setFormData({ ...formData, voeding_aanpassingen: value })}
                    modules={quillModules}
                    className="bg-white rounded-xl"
                    placeholder="Beschrijf eventuele aanpassingen in voeding..."
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Supplementen (max 3)</Label>
                    {(formData.supplementen?.length || 0) < 3 && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={addSupplement}
                        className="rounded-lg"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Toevoegen
                      </Button>
                    )}
                  </div>
                  
                  {formData.supplementen?.map((supp, index) => (
                    <div key={index} className="p-4 border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <Label className="text-sm font-medium">Supplement {index + 1}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSupplement(index)}
                          >
                            ✕
                          </Button>
                        </div>
                        <div className="grid gap-3">
                          <Input
                            placeholder="Naam supplement"
                            value={supp.naam}
                            onChange={(e) => updateSupplement(index, 'naam', e.target.value)}
                            className="rounded-lg"
                          />
                          <Input
                            placeholder="Dosering"
                            value={supp.dosering}
                            onChange={(e) => updateSupplement(index, 'dosering', e.target.value)}
                            className="rounded-lg"
                          />
                          <Input
                            placeholder="Doel"
                            value={supp.doel}
                            onChange={(e) => updateSupplement(index, 'doel', e.target.value)}
                            className="rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="advies" className="border-2 rounded-2xl bg-white" style={{ borderColor: 'var(--primary-pink)' }}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <span className="kwiek-heading text-xl">Advies</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="evaluatie_vorig_advies">Evaluatie Vorig Advies</Label>
                  <ReactQuill
                    theme="snow"
                    value={formData.evaluatie_vorig_advies || ''}
                    onChange={(value) => setFormData({ ...formData, evaluatie_vorig_advies: value })}
                    modules={quillModules}
                    className="bg-white rounded-xl"
                    placeholder="Hoe is het gegaan met het vorige advies?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nieuw_advies">Nieuw Advies</Label>
                  <ReactQuill
                    theme="snow"
                    value={formData.nieuw_advies || ''}
                    onChange={(value) => setFormData({ ...formData, nieuw_advies: value })}
                    modules={quillModules}
                    className="bg-white rounded-xl"
                    placeholder="Nieuw advies voor deze sessie..."
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="planning" className="border-2 rounded-2xl bg-white" style={{ borderColor: 'var(--primary-pink)' }}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <span className="kwiek-heading text-xl">Planning</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="volgende_afspraak">Volgende Afspraak (optioneel)</Label>
                  <Input
                    id="volgende_afspraak"
                    type="datetime-local"
                    value={formData.volgende_afspraak ? new Date(formData.volgende_afspraak).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, volgende_afspraak: e.target.value })}
                    className="rounded-xl border-2"
                    style={{ borderColor: 'var(--primary-pink)' }}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate(createPageUrl("HondenProfiel", `id=${session.dog_id}`))}
            className="rounded-xl"
          >
            Annuleren
          </Button>
          <Button 
            type="submit"
            className="rounded-xl"
            style={{ backgroundColor: 'var(--primary-blue)' }}
            disabled={updateSessionMutation.isPending}
          >
            {updateSessionMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Wijzigingen Opslaan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}