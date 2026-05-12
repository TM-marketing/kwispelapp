
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import SymptomGoalSliders from "../components/goals/SymptomGoalSliders";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Card } from "@/components/ui/card";

export default function NieuweSessie() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const dogId = urlParams.get('dogId');
  
  const [error, setError] = useState(null);

  // SINGLE SOURCE: DogSnapshot met verbeterde configuratie
  const { data: snapshot, isLoading } = useQuery({
    queryKey: ['dogSnapshot', dogId],
    queryFn: async () => {
      const response = await base44.functions.invoke('getDogSnapshot', { dogId });
      return response.data;
    },
    enabled: !!dogId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Cleanup query state bij unmount
  useEffect(() => {
    return () => {
      queryClient.resetQueries({ queryKey: ['dogSnapshot', dogId], exact: true });
    };
  }, [queryClient, dogId]);

  const [formData, setFormData] = useState({
    dog_id: dogId,
    type: "opvolging",
    datum: new Date().toISOString().slice(0, 16),
    locatie: "winkel",
    gewicht_kg: "",
    gewicht_notitie: "",
    // FIX: Symptoomscores starten op 0, worden later ingevuld vanuit snapshot
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

  // FIX: Gebruik useEffect met lege dependency array en check of data al geladen is
  useEffect(() => {
    if (!snapshot || !currentUser) return;

    // Only initialize once - check if symptoom_scores are still all 0
    // This is a heuristic to prevent re-initialization if the data has already been set.
    const allZero = Object.values(formData.symptoom_scores).every(v => v === 0);
    if (!allZero) return; // Already initialized

    const dog = snapshot.dog;
    const currentState = snapshot.current_state;
    const activeGoals = snapshot.goals || [];
    const latestWeight = currentState.weight?.latest_any;

    // Pre-fill symptoomscores met de laatste waarden
    const newSymptoomScores = currentState.symptomen ? {
      jeuk: currentState.symptomen.jeuk?.current || 0,
      roodheid: currentState.symptomen.roodheid?.current || 0,
      schilfers: currentState.symptomen.schilfers?.current || 0,
      stoelgang: currentState.symptomen.stoelgang?.current || 0,
      gedrag: currentState.symptomen.gedrag?.current || 0,
      energie: currentState.symptomen.energie?.current || 0
    } : formData.symptoom_scores;

    setFormData(prev => ({
      ...prev,
      voeding_huidige: dog.huidige_voeding || "",
      symptoom_scores: newSymptoomScores,
      gewicht_kg: latestWeight ? latestWeight.value.toString() : "",
      expert_naam: currentUser?.full_name || ""
    }));

    // Pre-fill existing goals
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
  }, [snapshot, currentUser]); // Only depend on snapshot and currentUser

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

  const createSessionMutation = useMutation({
    mutationFn: async (data) => {
      const filteredSupplements = data.supplementen.filter(s => s.naam || s.dosering || s.doel);
      const sessionData = { 
        ...data, 
        supplementen: filteredSupplements,
        status: 'final'
      };
      
      delete sessionData.gewicht_kg;
      delete sessionData.gewicht_notitie;

      const session = await base44.entities.Session.create(sessionData);
      
      // Create weight measurement if provided
      if (data.gewicht_kg) {
        await base44.entities.WeightMeasurement.create({
          dog_id: data.dog_id,
          session_id: session.id,
          datum: data.datum.split('T')[0],
          gewicht_kg: parseFloat(data.gewicht_kg),
          bron: "expert",
          verified_by_expert: true,
          opmerking: data.gewicht_notitie || ""
        });
      }

      // Handle symptom goals
      for (const [symptomKey, settings] of Object.entries(goalSettings)) {
        const existingGoalForSymptom = snapshot.goals.find(g => // Used snapshot.goals
          g.symptom_key === symptomKey && g.type === 'symptoom' && g.status === 'actief'
        );
        
        if (settings.enabled && settings.target) {
          const symptoomLabels = {
            jeuk: "Jeuk", roodheid: "Roodheid", schilfers: "Schilfers",
            stoelgang: "Stoelgang", gedrag: "Gedrag", energie: "Energie"
          };

          const targetValue = parseFloat(settings.target);
          if (isNaN(targetValue)) {
            console.warn(`Invalid target value for ${symptomKey}: ${settings.target}`);
            continue;
          }

          if (existingGoalForSymptom) {
            if (existingGoalForSymptom.streef_waarde !== targetValue) {
              await base44.entities.Goal.update(existingGoalForSymptom.id, {
                streef_waarde: targetValue,
              });
            }
          } else {
            await base44.entities.Goal.create({
              dog_id: data.dog_id,
              type: "symptoom",
              symptom_key: symptomKey,
              doel_omschrijving: `${symptoomLabels[symptomKey]} verbeteren`,
              start_waarde: data.symptoom_scores[symptomKey],
              streef_waarde: targetValue,
              start_datum: data.datum.split('T')[0],
              created_in_session_id: session.id, // Changed from start_session_id
              status: "actief",
              consecutive_success_count: 0
            });
          }
        }
      }

      // Handle weight goal
      const existingWeightGoal = snapshot.goals.find(g => g.type === 'gewicht' && g.status === 'actief'); // Used snapshot.goals
      if (gewichtGoalEnabled && gewichtGoalTarget && data.gewicht_kg) {
        const targetWeightValue = parseFloat(gewichtGoalTarget);
        if (!isNaN(targetWeightValue)) {
          if (existingWeightGoal) {
            if (existingWeightGoal.streef_waarde !== targetWeightValue) {
              await base44.entities.Goal.update(existingWeightGoal.id, {
                streef_waarde: targetWeightValue
              });
            }
          } else {
            await base44.entities.Goal.create({
              dog_id: data.dog_id,
              type: "gewicht",
              doel_omschrijving: `Gewicht naar ${gewichtGoalTarget} kg`,
              start_waarde: parseFloat(data.gewicht_kg),
              streef_waarde: targetWeightValue,
              start_datum: data.datum.split('T')[0],
              created_in_session_id: session.id, // Changed from start_session_id
              status: "actief",
              consecutive_success_count: 0
            });
          }
        }
      }
      
      return session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogSnapshot', dogId] }); // Invalidate dogSnapshot
      navigate(createPageUrl("HondenProfiel", `id=${dogId}`));
    },
    onError: (error) => {
      setError("Er is een fout opgetreden bij het opslaan van de sessie.");
      console.error(error);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.dog_id || !formData.datum) {
      setError("Vul alle verplichte velden in");
      return;
    }

    createSessionMutation.mutate(formData);
  };

  const addSupplement = () => {
    setFormData({
      ...formData,
      supplementen: [...formData.supplementen, { naam: "", dosering: "", doel: "" }]
    });
  };

  const updateSupplement = (index, field, value) => {
    const newSupplementen = [...formData.supplementen];
    newSupplementen[index][field] = value;
    setFormData({ ...formData, supplementen: newSupplementen });
  };

  const removeSupplement = (index) => {
    setFormData({
      ...formData,
      supplementen: formData.supplementen.filter((_, i) => i !== index)
    });
  };

  // Loading state
  // Modified loading condition to reflect the new initialization logic
  if (isLoading || !snapshot || !currentUser || Object.values(formData.symptoom_scores).every(v => v === 0)) {
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

  // Derive data from snapshot
  const dog = snapshot.dog;
  const previousSession = snapshot.trends?.sessions_last_6?.[0]; // Get the most recent session from snapshot trends
  const latestWeight = snapshot.current_state?.weight?.latest_any; // Get latest weight from snapshot current state

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(createPageUrl("HondenProfiel", `id=${dogId}`))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
        <div>
          <h1 className="kwiek-heading text-3xl">Nieuwe Opvolgsessie</h1>
          <p className="text-gray-600 mt-1">Voor {dog.naam}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Accordion type="multiple" defaultValue={["basis", "gewicht", "symptomen"]} className="space-y-4">
          
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
                    placeholder={latestWeight ? `Vorig: ${latestWeight.value}kg` : ""}
                  />
                  {latestWeight && (
                    <p className="text-xs text-gray-500">
                      Vorige meting: {latestWeight.value} kg ({format(new Date(latestWeight.date), 'd MMM yyyy', { locale: nl })})
                    </p>
                  )}
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
              <p className="text-sm text-gray-600 mb-4">
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
                    value={formData.huid_en_vacht_opmerking}
                    onChange={(value) => setFormData({ ...formData, huid_en_vacht_opmerking: value })}
                    modules={quillModules}
                    className="bg-white rounded-xl"
                    placeholder="Observaties m.b.t. huid en vacht..."
                  />
                  {previousSession?.huid_en_vacht_opmerking && previousSession?.datum && (
                    <details className="text-xs text-gray-500 mt-2">
                      <summary className="cursor-pointer hover:text-gray-700">Vorige sessie ({format(new Date(previousSession.datum), 'd MMM yyyy', { locale: nl })})</summary>
                      <div className="mt-2 p-2 bg-gray-50 rounded" dangerouslySetInnerHTML={{ __html: previousSession.huid_en_vacht_opmerking }} />
                    </details>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="andere_gezondheidsproblemen_opmerking">Andere Gezondheidsproblemen</Label>
                  <ReactQuill
                    theme="snow"
                    value={formData.andere_gezondheidsproblemen_opmerking}
                    onChange={(value) => setFormData({ ...formData, andere_gezondheidsproblemen_opmerking: value })}
                    modules={quillModules}
                    className="bg-white rounded-xl"
                    placeholder="Observaties m.b.t. stoelgang, spijsvertering, etc..."
                  />
                  {previousSession?.andere_gezondheidsproblemen_opmerking && previousSession?.datum && (
                    <details className="text-xs text-gray-500 mt-2">
                      <summary className="cursor-pointer hover:text-gray-700">Vorige sessie ({format(new Date(previousSession.datum), 'd MMM yyyy', { locale: nl })})</summary>
                      <div className="mt-2 p-2 bg-gray-50 rounded" dangerouslySetInnerHTML={{ __html: previousSession.andere_gezondheidsproblemen_opmerking }} />
                    </details>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="algemene_notities">Algemene Notities</Label>
                  <ReactQuill
                    theme="snow"
                    value={formData.algemene_notities}
                    onChange={(value) => setFormData({ ...formData, algemene_notities: value })}
                    modules={quillModules}
                    className="bg-white rounded-xl"
                    placeholder="Algemene observaties..."
                  />
                  {previousSession?.algemene_notities && previousSession?.datum && (
                    <details className="text-xs text-gray-500 mt-2">
                      <summary className="cursor-pointer hover:text-gray-700">Vorige sessie ({format(new Date(previousSession.datum), 'd MMM yyyy', { locale: nl })})</summary>
                      <div className="mt-2 p-2 bg-gray-50 rounded" dangerouslySetInnerHTML={{ __html: previousSession.algemene_notities }} />
                    </details>
                  )}
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
                  <Label htmlFor="voeding_huidige">Huidige Voeding</Label>
                  <Input
                    id="voeding_huidige"
                    value={formData.voeding_huidige}
                    onChange={(e) => setFormData({ ...formData, voeding_huidige: e.target.value })}
                    className="rounded-xl border-2"
                    style={{ borderColor: 'var(--primary-pink)' }}
                    placeholder="Huidige voeding van de hond..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voeding_aanpassingen">Voedingsaanpassingen & Advies</Label>
                  <ReactQuill
                    theme="snow"
                    value={formData.voeding_aanpassingen}
                    onChange={(value) => setFormData({ ...formData, voeding_aanpassingen: value })}
                    modules={quillModules}
                    className="bg-white rounded-xl"
                    placeholder="Beschrijf eventuele aanpassingen in voeding..."
                  />
                  {previousSession?.voeding_aanpassingen && previousSession?.datum && (
                    <details className="text-xs text-gray-500 mt-2">
                      <summary className="cursor-pointer hover:text-gray-700">Vorige sessie ({format(new Date(previousSession.datum), 'd MMM yyyy', { locale: nl })})</summary>
                      <div className="mt-2 p-2 bg-gray-50 rounded" dangerouslySetInnerHTML={{ __html: previousSession.voeding_aanpassingen }} />
                    </details>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Supplementen (max 3)</Label>
                    {formData.supplementen.length < 3 && (
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
                  
                  {formData.supplementen.map((supp, index) => (
                    <Card key={index} className="p-4 border-2" style={{ borderColor: 'var(--primary-pink)', opacity: 0.5 }}>
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
                    </Card>
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
                    value={formData.evaluatie_vorig_advies}
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
                    value={formData.nieuw_advies}
                    onChange={(value) => setFormData({ ...formData, nieuw_advies: value })}
                    modules={quillModules}
                    className="bg-white rounded-xl"
                    placeholder="Nieuw advies voor deze sessie..."
                  />
                  {previousSession?.nieuw_advies && previousSession?.datum && (
                    <details className="text-xs text-gray-500 mt-2">
                      <summary className="cursor-pointer hover:text-gray-700">Vorige sessie ({format(new Date(previousSession.datum), 'd MMM yyyy', { locale: nl })})</summary>
                      <div className="mt-2 p-2 bg-gray-50 rounded" dangerouslySetInnerHTML={{ __html: previousSession.nieuw_advies }} />
                    </details>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="planning" className="border-2 rounded-2xl bg-white" style={{ borderColor: 'var(--primary-pink)' }}>
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <span className="kwiek-heading text-xl">Planning</span>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-2">
                <Label htmlFor="volgende_afspraak">Volgende Afspraak (optioneel)</Label>
                <Input
                  id="volgende_afspraak"
                  type="datetime-local"
                  value={formData.volgende_afspraak}
                  onChange={(e) => setFormData({ ...formData, volgende_afspraak: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate(createPageUrl("HondenProfiel", `id=${dogId}`))}
            className="rounded-xl"
          >
            Annuleren
          </Button>
          <Button 
            type="submit"
            className="rounded-xl"
            style={{ backgroundColor: 'var(--primary-blue)' }}
            disabled={createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Opslaan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Sessie Opslaan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
