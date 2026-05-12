import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NieuweAfspraak() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const dogId = urlParams.get('dogId');
  const appointmentId = urlParams.get('id');
  
  const [error, setError] = useState(null);
  const [isEditMode] = useState(!!appointmentId);

  const { data: existingAppointment } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: async () => {
      const appointments = await base44.entities.Appointment.list();
      return appointments.find(a => a.id === appointmentId);
    },
    enabled: !!appointmentId,
  });

  const { data: dog } = useQuery({
    queryKey: ['dog', dogId],
    queryFn: async () => {
      const dogs = await base44.entities.Dog.list();
      return dogs.find(d => d.id === dogId);
    },
    enabled: !!dogId,
  });

  const { data: dogs } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => base44.entities.Dog.list(),
    initialData: [],
    enabled: !dogId,
  });

  const [formData, setFormData] = useState({
    dog_id: dogId || "",
    datum_tijd: "",
    duur_minuten: 60,
    locatie: "winkel",
    status: "gepland",
    herinnering_email: true,
    notitie: ""
  });

  useEffect(() => {
    if (existingAppointment) {
      setFormData({
        dog_id: existingAppointment.dog_id,
        datum_tijd: existingAppointment.datum_tijd ? new Date(existingAppointment.datum_tijd).toISOString().slice(0, 16) : '',
        duur_minuten: existingAppointment.duur_minuten || 60,
        locatie: existingAppointment.locatie || "winkel",
        status: existingAppointment.status || "gepland",
        herinnering_email: existingAppointment.herinnering_email !== false,
        notitie: existingAppointment.notitie || ""
      });
    }
  }, [existingAppointment]);

  const createAfspraakMutation = useMutation({
    mutationFn: (data) => base44.entities.Appointment.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['nextAppointment', data.dog_id] });
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
      
      if (dogId) {
        navigate(createPageUrl("HondenProfiel", `id=${dogId}`));
      } else {
        navigate(createPageUrl("Agenda"));
      }
    },
    onError: (error) => {
      console.error("Create appointment failed:", error);
      setError("Er is een fout opgetreden bij het aanmaken van de afspraak.");
    }
  });

  const updateAfspraakMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Appointment.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['nextAppointment', data.dog_id] });
      queryClient.invalidateQueries({ queryKey: ['appointment', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['upcomingAppointments'] });
      
      navigate(createPageUrl("Agenda"));
    },
    onError: (error) => {
      console.error("Update appointment failed:", error);
      setError("Er is een fout opgetreden bij het bijwerken van de afspraak.");
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.dog_id || !formData.datum_tijd) {
      setError("Vul alle verplichte velden in (hond en datum/tijd)");
      return;
    }

    const submitData = {
      ...formData,
      duur_minuten: parseInt(formData.duur_minuten)
    };

    if (isEditMode && appointmentId) {
      updateAfspraakMutation.mutate({ id: appointmentId, data: submitData });
    } else {
      createAfspraakMutation.mutate(submitData);
    }
  };

  const handleBack = () => {
    if (appointmentId) {
      navigate(createPageUrl("Agenda"));
    } else if (dogId) {
      navigate(createPageUrl("HondenProfiel", `id=${dogId}`));
    } else {
      navigate(createPageUrl("Agenda"));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug
        </Button>
        <div>
          <h1 className="kwiek-heading text-3xl">
            {isEditMode ? 'Afspraak Bewerken' : 'Nieuwe Afspraak'}
          </h1>
          {dog && <p className="text-gray-600 mt-1">Voor {dog.naam}</p>}
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
            <CardTitle className="kwiek-heading">Afspraak Gegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!dogId && (
              <div className="space-y-2">
                <Label htmlFor="dog_id">Hond *</Label>
                <Select 
                  value={formData.dog_id} 
                  onValueChange={(value) => setFormData({ ...formData, dog_id: value })}
                >
                  <SelectTrigger className="rounded-xl border-2" style={{ borderColor: 'var(--primary-pink)' }}>
                    <SelectValue placeholder="Selecteer een hond..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dogs.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.naam} - {d.baasje_naam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="datum_tijd">Datum & Tijd *</Label>
                <Input
                  id="datum_tijd"
                  type="datetime-local"
                  value={formData.datum_tijd}
                  onChange={(e) => setFormData({ ...formData, datum_tijd: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duur_minuten">Duur (minuten)</Label>
                <Input
                  id="duur_minuten"
                  type="number"
                  value={formData.duur_minuten}
                  onChange={(e) => setFormData({ ...formData, duur_minuten: e.target.value })}
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                />
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="notitie">Notitie (optioneel)</Label>
              <Textarea
                id="notitie"
                value={formData.notitie}
                onChange={(e) => setFormData({ ...formData, notitie: e.target.value })}
                className="rounded-xl border-2"
                style={{ borderColor: 'var(--primary-pink)' }}
                placeholder="Bijv. speciale wensen, voorbereiding, etc."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="herinnering_email"
                checked={formData.herinnering_email}
                onCheckedChange={(checked) => setFormData({ ...formData, herinnering_email: checked })}
              />
              <Label htmlFor="herinnering_email" className="cursor-pointer">
                Email herinnering versturen
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={handleBack}
            className="rounded-xl"
          >
            Annuleren
          </Button>
          <Button 
            type="submit"
            className="rounded-xl"
            style={{ backgroundColor: 'var(--primary-blue)' }}
            disabled={createAfspraakMutation.isPending || updateAfspraakMutation.isPending}
          >
            {createAfspraakMutation.isPending || updateAfspraakMutation.isPending ? (
              <>Opslaan...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? 'Wijzigingen Opslaan' : 'Afspraak Opslaan'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}