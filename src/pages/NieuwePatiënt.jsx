import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function NieuwePatiënt() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    naam: "",
    ras: "",
    geboortejaar: new Date().getFullYear(),
    geslacht: "mannelijk",
    gecastreerd: false,
    foto_url: "",
    huidig_gewicht: "",
    huidige_voeding: "",
    hoeveelheid_voeding: "",
    bijvoeding: "",
    aantal_voedingen: 2,
    eetgedrag: "rustig",
    allergieën: "",
    medicatie: "",
    supplementen: "",
    andere_gezondheidsproblemen: "",
    huid_en_vacht: "",
    dagelijkse_activiteit: "",
    ongewenst_gedrag: "",
    gras_eten: "zelden_of_nooit",
    ontlasting_samenvatting: "",
    karakter: "",
    aanvullingen: "",
    eerste_advies: "",
    status_tags: [],
    baasje_naam: "",
    baasje_email: "",
    baasje_telefoon: "",
    baasje_postcode: "",
    baasje_plaats: "",
    visualisaties: {
      gewicht_grafiek: true,
      symptoom_radar: false,
      doelen_progressie: false,
      stoelgang_trend: false,
      jeuk_trend: false
    }
  });

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['clean']
    ],
  };

  const createDogMutation = useMutation({
    mutationFn: async (data) => {
      const dog = await base44.entities.Dog.create(data);
      
      if (data.eerste_advies && data.eerste_advies.trim()) {
        await base44.entities.Session.create({
          dog_id: dog.id,
          type: "intake",
          datum: new Date().toISOString(),
          locatie: "kliniek",
          gewicht_kg: data.huidig_gewicht || null,
          voeding_huidige: data.huidige_voeding || "",
          nieuw_advies: data.eerste_advies,
          status: "final",
          expert_naam: ""
        });
        
        if (data.huidig_gewicht) {
          await base44.entities.WeightMeasurement.create({
            dog_id: dog.id,
            datum: new Date().toISOString().split('T')[0],
            gewicht_kg: parseFloat(data.huidig_gewicht),
            bron: "expert",
            opmerking: "Startgewicht bij intake"
          });
        }
      }
      
      return dog;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      navigate(createPageUrl("HondenProfiel", `id=${data.id}`));
    },
    onError: (error) => {
      setError("Er is een fout opgetreden bij het aanmaken van het profiel.");
      console.error(error);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, foto_url: file_url });
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.naam || !formData.baasje_naam || !formData.baasje_email) {
      setError("Vul alle verplichte velden in (naam hond, naam baasje, email baasje)");
      return;
    }

    const submitData = {
      ...formData,
      huidig_gewicht: formData.huidig_gewicht ? parseFloat(formData.huidig_gewicht) : null,
      geboortejaar: parseInt(formData.geboortejaar),
      aantal_voedingen: parseInt(formData.aantal_voedingen),
    };

    createDogMutation.mutate(submitData);
  };

  const handleCheckboxChange = (tag) => {
    const newTags = formData.status_tags.includes(tag)
      ? formData.status_tags.filter(t => t !== tag)
      : [...formData.status_tags, tag];
    setFormData({ ...formData, status_tags: newTags });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(createPageUrl("Dashboard"))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
        <div>
          <h1 className="kwiek-heading text-3xl">Nieuwe Patiënt</h1>
          <p className="text-gray-600 mt-1">Voeg een nieuw hondenprofiel toe</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basisinformatie Hond */}
        <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader>
            <CardTitle className="kwiek-heading">Basisinformatie Hond</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="naam">Naam *</Label>
                <Input
                  id="naam"
                  value={formData.naam}
                  onChange={(e) => setFormData({ ...formData, naam: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ras">Ras</Label>
                <Input
                  id="ras"
                  value={formData.ras}
                  onChange={(e) => setFormData({ ...formData, ras: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="geboortejaar">Geboortejaar</Label>
                <Input
                  id="geboortejaar"
                  type="number"
                  value={formData.geboortejaar}
                  onChange={(e) => setFormData({ ...formData, geboortejaar: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="geslacht">Geslacht</Label>
                <Select 
                  value={formData.geslacht} 
                  onValueChange={(value) => setFormData({ ...formData, geslacht: value })}
                >
                  <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--primary-pink)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mannelijk">Mannelijk</SelectItem>
                    <SelectItem value="vrouwelijk">Vrouwelijk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="huidig_gewicht">Huidig Gewicht (kg)</Label>
                <Input
                  id="huidig_gewicht"
                  type="number"
                  step="0.1"
                  value={formData.huidig_gewicht}
                  onChange={(e) => setFormData({ ...formData, huidig_gewicht: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="gecastreerd"
                checked={formData.gecastreerd}
                onCheckedChange={(checked) => setFormData({ ...formData, gecastreerd: checked })}
              />
              <Label htmlFor="gecastreerd" className="cursor-pointer">
                Gecastreerd/Gesteriliseerd
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="foto">Foto</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="foto"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                  disabled={uploading}
                />
                {uploading && <span className="text-sm text-gray-500">Uploaden...</span>}
              </div>
              {formData.foto_url && (
                <img src={formData.foto_url} alt="Preview" className="w-32 h-32 object-cover rounded-xl mt-2" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Contact Baasje */}
        <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader>
            <CardTitle className="kwiek-heading">Contact Eigenaar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baasje_naam">Naam *</Label>
                <Input
                  id="baasje_naam"
                  value={formData.baasje_naam}
                  onChange={(e) => setFormData({ ...formData, baasje_naam: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baasje_email">Email *</Label>
                <Input
                  id="baasje_email"
                  type="email"
                  value={formData.baasje_email}
                  onChange={(e) => setFormData({ ...formData, baasje_email: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                  required
                />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baasje_telefoon">Telefoon</Label>
                <Input
                  id="baasje_telefoon"
                  value={formData.baasje_telefoon}
                  onChange={(e) => setFormData({ ...formData, baasje_telefoon: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baasje_postcode">Postcode</Label>
                <Input
                  id="baasje_postcode"
                  value={formData.baasje_postcode}
                  onChange={(e) => setFormData({ ...formData, baasje_postcode: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baasje_plaats">Plaats</Label>
                <Input
                  id="baasje_plaats"
                  value={formData.baasje_plaats}
                  onChange={(e) => setFormData({ ...formData, baasje_plaats: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voeding */}
        <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader>
            <CardTitle className="kwiek-heading">Voeding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="huidige_voeding">Huidige Voeding</Label>
              <ReactQuill
                theme="snow"
                value={formData.huidige_voeding}
                onChange={(value) => setFormData({ ...formData, huidige_voeding: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
                placeholder="Beschrijf de huidige voeding..."
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hoeveelheid_voeding">Hoeveelheid per dag</Label>
                <Input
                  id="hoeveelheid_voeding"
                  value={formData.hoeveelheid_voeding}
                  onChange={(e) => setFormData({ ...formData, hoeveelheid_voeding: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                  placeholder="bv. 180g/dag"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aantal_voedingen">Aantal voedingen per dag</Label>
                <Input
                  id="aantal_voedingen"
                  type="number"
                  value={formData.aantal_voedingen}
                  onChange={(e) => setFormData({ ...formData, aantal_voedingen: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eetgedrag">Eetgedrag</Label>
              <Select 
                value={formData.eetgedrag} 
                onValueChange={(value) => setFormData({ ...formData, eetgedrag: value })}
              >
                <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--primary-pink)' }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rustig">Rustig</SelectItem>
                  <SelectItem value="schrokker">Schrokker</SelectItem>
                  <SelectItem value="kieskeurig">Kieskeurig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bijvoeding">Bijvoeding / Snacks</Label>
              <ReactQuill
                theme="snow"
                value={formData.bijvoeding}
                onChange={(value) => setFormData({ ...formData, bijvoeding: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
                placeholder="Beschrijf bijvoeding en snacks..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Gezondheid */}
        <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader>
            <CardTitle className="kwiek-heading">Gezondheid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allergieën">Bekende Allergieën</Label>
              <ReactQuill
                theme="snow"
                value={formData.allergieën}
                onChange={(value) => setFormData({ ...formData, allergieën: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
                placeholder="Beschrijf bekende allergieën..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="huid_en_vacht">Huid & Vacht</Label>
              <ReactQuill
                theme="snow"
                value={formData.huid_en_vacht}
                onChange={(value) => setFormData({ ...formData, huid_en_vacht: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
                placeholder="Zijn er problemen met de huid- en vachtconditie? (jeuk, kale plekken, schilfers, roodheid)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="andere_gezondheidsproblemen">Andere Gezondheidsproblemen</Label>
              <ReactQuill
                theme="snow"
                value={formData.andere_gezondheidsproblemen}
                onChange={(value) => setFormData({ ...formData, andere_gezondheidsproblemen: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
                placeholder="Heeft je hond andere gezondheidsproblemen? (bv. slappe stoelgang, winderigheid, diarree, lusteloosheid, ...)"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medicatie">Huidige Medicatie</Label>
                <ReactQuill
                  theme="snow"
                  value={formData.medicatie}
                  onChange={(value) => setFormData({ ...formData, medicatie: value })}
                  modules={quillModules}
                  className="bg-white rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplementen">Huidige Supplementen</Label>
                <ReactQuill
                  theme="snow"
                  value={formData.supplementen}
                  onChange={(value) => setFormData({ ...formData, supplementen: value })}
                  modules={quillModules}
                  className="bg-white rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Status Tags</Label>
              <div className="grid md:grid-cols-3 gap-3">
                {['overgewicht', 'ondergewicht', 'allergieën', 'huidproblemen', 'spijsverteringsproblemen', 'gedragsproblemen'].map(tag => (
                  <div key={tag} className="flex items-center space-x-2">
                    <Checkbox
                      id={tag}
                      checked={formData.status_tags.includes(tag)}
                      onCheckedChange={() => handleCheckboxChange(tag)}
                    />
                    <Label htmlFor={tag} className="cursor-pointer capitalize">
                      {tag}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gedrag & Activiteit */}
        <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader>
            <CardTitle className="kwiek-heading">Gedrag & Activiteit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dagelijkse_activiteit">Dagelijkse Activiteit</Label>
              <ReactQuill
                theme="snow"
                value={formData.dagelijkse_activiteit}
                onChange={(value) => setFormData({ ...formData, dagelijkse_activiteit: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
                placeholder="Wandelingen, spelen, snuffelen..."
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="karakter">Karakter</Label>
                <ReactQuill
                  theme="snow"
                  value={formData.karakter}
                  onChange={(value) => setFormData({ ...formData, karakter: value })}
                  modules={quillModules}
                  className="bg-white rounded-xl"
                  placeholder="Energiek, rustig, speels..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ongewenst_gedrag">Ongewenst Gedrag</Label>
                <ReactQuill
                  theme="snow"
                  value={formData.ongewenst_gedrag}
                  onChange={(value) => setFormData({ ...formData, ongewenst_gedrag: value })}
                  modules={quillModules}
                  className="bg-white rounded-xl"
                  placeholder="Blaffen, trekken aan de lijn..."
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gras_eten">Gras Eten</Label>
                <Select 
                  value={formData.gras_eten} 
                  onValueChange={(value) => setFormData({ ...formData, gras_eten: value })}
                >
                  <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--primary-pink)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vaak">Vaak</SelectItem>
                    <SelectItem value="soms">Soms</SelectItem>
                    <SelectItem value="zelden_of_nooit">Zelden of nooit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ontlasting_samenvatting">Ontlasting</Label>
                <ReactQuill
                  theme="snow"
                  value={formData.ontlasting_samenvatting}
                  onChange={(value) => setFormData({ ...formData, ontlasting_samenvatting: value })}
                  modules={quillModules}
                  className="bg-white rounded-xl"
                  placeholder="Frequentie, consistentie..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aanvullingen">Aanvullende Informatie</Label>
              <ReactQuill
                theme="snow"
                value={formData.aanvullingen}
                onChange={(value) => setFormData({ ...formData, aanvullingen: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
                placeholder="Overige informatie..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Voedingsadvies (Eerste Advies) */}
        <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-blue)' }}>
          <CardHeader>
            <CardTitle className="kwiek-heading">Voedingsadvies (Eerste Sessie)</CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Dit is het eerste advies, gegeven tijdens het intake- of eerste consult. 
              Het verschijnt onder het tabblad 'Huidig Advies'.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eerste_advies">Eerste Advies (Optioneel)</Label>
              <ReactQuill
                theme="snow"
                value={formData.eerste_advies}
                onChange={(value) => setFormData({ ...formData, eerste_advies: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
                style={{ minHeight: '200px' }}
              />
              <p className="text-xs text-gray-500 mt-2">
                Gebruik de editor om een gestructureerd advies op te stellen met koppen, lijsten en opmaak.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="rounded-xl"
          >
            Annuleren
          </Button>
          <Button 
            type="submit"
            className="rounded-xl"
            style={{ backgroundColor: 'var(--primary-blue)' }}
            disabled={createDogMutation.isPending}
          >
            {createDogMutation.isPending ? (
              <>Opslaan...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Profiel Aanmaken
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}