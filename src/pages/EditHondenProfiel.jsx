
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function EditHondenProfiel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const dogId = urlParams.get('id');

  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState(null);

  const { data: dog, isLoading } = useQuery({
    queryKey: ['dog', dogId],
    queryFn: async () => {
      if (!dogId) throw new Error('Geen hond ID opgegeven');
      const dogs = await base44.entities.Dog.list();
      const found = dogs.find(d => d.id === dogId);
      if (!found) throw new Error('Hond niet gevonden');
      return found;
    },
    enabled: !!dogId,
  });

  useEffect(() => {
    if (dog) {
      setFormData({
        ...dog,
        status_tags: dog.status_tags || [],
      });
    }
  }, [dog]);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link'],
      ['clean']
    ],
  };

  const updateDogMutation = useMutation({
    mutationFn: async (data) => {
      const updateData = {
        ...data,
        start_weight_kg: data.start_weight_kg ? parseFloat(data.start_weight_kg) : null,
        geboortejaar: data.geboortejaar ? parseInt(data.geboortejaar) : null,
        aantal_voedingen: parseInt(data.aantal_voedingen),
      };
      
      await base44.entities.Dog.update(dogId, updateData);
      return updateData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      queryClient.invalidateQueries({ queryKey: ['dogSnapshot', dogId] });
      navigate(createPageUrl("HondenDetail", `id=${dogId}`));
    },
    onError: (error) => {
      setError("Er is een fout opgetreden bij het bijwerken van het profiel.");
      console.error(error);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, foto_url: file_url });
    } catch (err) {
      setError("Fout bij uploaden van foto");
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.naam || !formData.baasje_naam || !formData.baasje_email) {
      setError("Vul alle verplichte velden in");
      return;
    }

    updateDogMutation.mutate(formData);
  };

  const handleCheckboxChange = (tag) => {
    setFormData(prev => {
      const newTags = prev.status_tags.includes(tag)
        ? prev.status_tags.filter(t => t !== tag)
        : [...prev.status_tags, tag];
      return { ...prev, status_tags: newTags };
    });
  };

  if (isLoading || !formData) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: 'var(--primary-blue)' }} />
            <p className="text-lg" style={{ color: 'var(--primary-blue)' }}>Profiel laden...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate(createPageUrl("HondenDetail", `id=${dogId}`))}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
        <div>
          <h1 className="kwiek-heading text-3xl">Profiel Bewerken</h1>
          <p className="text-gray-600 mt-1">{formData.naam}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                  value={formData.ras || ''}
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
                  value={formData.geboortejaar || ''}
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
                <Label htmlFor="start_weight_kg">Startgewicht (kg)</Label>
                <Input
                  id="start_weight_kg"
                  type="number"
                  step="0.1"
                  value={formData.start_weight_kg || ''}
                  onChange={(e) => setFormData({ ...formData, start_weight_kg: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                  placeholder="bv. 12.5"
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
                  value={formData.baasje_naam || ''}
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
                  value={formData.baasje_email || ''}
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
                  value={formData.baasje_telefoon || ''}
                  onChange={(e) => setFormData({ ...formData, baasje_telefoon: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baasje_postcode">Postcode</Label>
                <Input
                  id="baasje_postcode"
                  value={formData.baasje_postcode || ''}
                  onChange={(e) => setFormData({ ...formData, baasje_postcode: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baasje_plaats">Plaats</Label>
                <Input
                  id="baasje_plaats"
                  value={formData.baasje_plaats || ''}
                  onChange={(e) => setFormData({ ...formData, baasje_plaats: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader>
            <CardTitle className="kwiek-heading">Voeding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="huidige_voeding">Huidige Voeding</Label>
              <ReactQuill
                theme="snow"
                value={formData.huidige_voeding || ''}
                onChange={(value) => setFormData({ ...formData, huidige_voeding: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hoeveelheid_voeding">Hoeveelheid per dag</Label>
                <Input
                  id="hoeveelheid_voeding"
                  value={formData.hoeveelheid_voeding || ''}
                  onChange={(e) => setFormData({ ...formData, hoeveelheid_voeding: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aantal_voedingen">Aantal voedingen per dag</Label>
                <Input
                  id="aantal_voedingen"
                  type="number"
                  value={formData.aantal_voedingen || 2}
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
                value={formData.bijvoeding || ''}
                onChange={(value) => setFormData({ ...formData, bijvoeding: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader>
            <CardTitle className="kwiek-heading">Gezondheid</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allergieën">Bekende Allergieën</Label>
              <ReactQuill
                theme="snow"
                value={formData.allergieën || ''}
                onChange={(value) => setFormData({ ...formData, allergieën: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="huid_en_vacht">Huid & Vacht</Label>
              <ReactQuill
                theme="snow"
                value={formData.huid_en_vacht || ''}
                onChange={(value) => setFormData({ ...formData, huid_en_vacht: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="andere_gezondheidsproblemen">Andere Gezondheidsproblemen</Label>
              <ReactQuill
                theme="snow"
                value={formData.andere_gezondheidsproblemen || ''}
                onChange={(value) => setFormData({ ...formData, andere_gezondheidsproblemen: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medicatie">Huidige Medicatie</Label>
                <ReactQuill
                  theme="snow"
                  value={formData.medicatie || ''}
                  onChange={(value) => setFormData({ ...formData, medicatie: value })}
                  modules={quillModules}
                  className="bg-white rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplementen">Huidige Supplementen</Label>
                <ReactQuill
                  theme="snow"
                  value={formData.supplementen || ''}
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
                      checked={formData.status_tags?.includes(tag)}
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

        <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader>
            <CardTitle className="kwiek-heading">Gedrag & Activiteit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dagelijkse_activiteit">Dagelijkse Activiteit</Label>
              <ReactQuill
                theme="snow"
                value={formData.dagelijkse_activiteit || ''}
                onChange={(value) => setFormData({ ...formData, dagelijkse_activiteit: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="karakter">Karakter</Label>
                <ReactQuill
                  theme="snow"
                  value={formData.karakter || ''}
                  onChange={(value) => setFormData({ ...formData, karakter: value })}
                  modules={quillModules}
                  className="bg-white rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ongewenst_gedrag">Ongewenst Gedrag</Label>
                <ReactQuill
                  theme="snow"
                  value={formData.ongewenst_gedrag || ''}
                  onChange={(value) => setFormData({ ...formData, ongewenst_gedrag: value })}
                  modules={quillModules}
                  className="bg-white rounded-xl"
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
                  value={formData.ontlasting_samenvatting || ''}
                  onChange={(value) => setFormData({ ...formData, ontlasting_samenvatting: value })}
                  modules={quillModules}
                  className="bg-white rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="aanvullingen">Aanvullende Informatie</Label>
              <ReactQuill
                theme="snow"
                value={formData.aanvullingen || ''}
                onChange={(value) => setFormData({ ...formData, aanvullingen: value })}
                modules={quillModules}
                className="bg-white rounded-xl"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => navigate(createPageUrl("HondenDetail", `id=${dogId}`))}
            className="rounded-xl"
          >
            Annuleren
          </Button>
          <Button 
            type="submit"
            className="rounded-xl"
            style={{ backgroundColor: 'var(--primary-blue)' }}
            disabled={updateDogMutation.isPending}
          >
            {updateDogMutation.isPending ? (
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
