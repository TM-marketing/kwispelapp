
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  Plus,
  Activity,
  Target,
  Edit,
  Mail,
  Phone,
  MapPin,
  Weight,
  PawPrint,
  Users,
  CheckCircle,
  AlertCircle,
  User,
  Tag,
  Scissors,
  LayoutGrid,
  MessageSquare,
  TrendingUp as ChartIcon,
  History,
  Crosshair,
  Loader2,
  Trash2,
  Share2
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

import WeightChart from "../components/profiel/WeightChart";
import SessionTimeline from "../components/profiel/SessionTimeline";
import GoalCard from "../components/goals/GoalCard";
import AddGoalModal from "../components/goals/AddGoalModal";
import ShareProfileModal from "../components/profiel/ShareProfileModal";

export default function HondenDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const dogId = urlParams.get('id');

  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // SINGLE SOURCE: DogSnapshot met verbeterde configuratie
  const { data: snapshot, isLoading, error, isError } = useQuery({
    queryKey: ['dogSnapshot', dogId],
    queryFn: async () => {
      if (!dogId) {
        throw new Error('Geen hond ID opgegeven in de URL');
      }
      const response = await base44.functions.invoke('getDogSnapshot', { dogId });
      if (!response?.data) {
        throw new Error('Geen data ontvangen van server');
      }
      return response.data;
    },
    enabled: !!dogId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Cleanup query state bij unmount
  useEffect(() => {
    return () => {
      queryClient.resetQueries({ queryKey: ['dogSnapshot', dogId], exact: true });
    };
  }, [queryClient, dogId]);

  // Delete mutation
  const deleteDogMutation = useMutation({
    mutationFn: async (dogIdToDelete) => {
      const [sessions, weights, goals, appointments] = await Promise.all([
        base44.entities.Session.list(),
        base44.entities.WeightMeasurement.list(),
        base44.entities.Goal.list(),
        base44.entities.Appointment.list()
      ]);

      const sessionIds = sessions.filter(s => s.dog_id === dogIdToDelete).map(s => s.id);
      const weightIds = weights.filter(w => w.dog_id === dogIdToDelete).map(w => w.id);
      const goalIds = goals.filter(g => g.dog_id === dogIdToDelete).map(g => g.id);
      const appointmentIds = appointments.filter(a => a.dog_id === dogIdToDelete).map(a => a.id);

      await Promise.all([
        ...sessionIds.map(id => base44.entities.Session.delete(id)),
        ...weightIds.map(id => base44.entities.WeightMeasurement.delete(id)),
        ...goalIds.map(id => base44.entities.Goal.delete(id)),
        ...appointmentIds.map(id => base44.entities.Appointment.delete(id))
      ]);

      await base44.entities.Dog.delete(dogIdToDelete);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dogs'] });
      navigate(createPageUrl("Dashboard"));
    },
  });

  // Loading State
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: 'var(--primary-blue)' }} />
            <p className="text-lg" style={{ color: 'var(--primary-blue)' }}>Profiel laden...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State - Verbeterde error handling
  if (isError || !snapshot || !snapshot.dog) {
    console.error('HondenDetail Error:', error);

    let errorMessage = 'Er is een onbekende fout opgetreden bij het laden van het profiel.';
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.response?.data?.error) {
      errorMessage = `Serverfout: ${error.response.data.error}`;
    } else if (!dogId) {
      errorMessage = 'Geen hond ID opgegeven in de URL. Controleer de URL en probeer opnieuw.';
    } else if (!snapshot) {
      errorMessage = 'Geen data ontvangen van de server. Mogelijk is de server niet bereikbaar of is er een probleem met de verbinding.';
    } else if (!snapshot.dog) {
      errorMessage = 'De gegevens voor deze hond ontbreken in de serverreactie. Het profiel bestaat mogelijk niet of is onvolledig.';
    }

    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card className="border-2 border-red-300">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-red-700 mb-2">Fout bij laden</h2>
            <p className="text-gray-600 mb-2">{errorMessage}</p>
            {error?.stack && (
              <details className="text-left mt-4">
                <summary className="text-sm text-gray-500 cursor-pointer">Technische details</summary>
                <pre className="text-xs text-gray-400 mt-2 p-2 bg-gray-50 rounded overflow-auto">
                  {error.stack}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <Button onClick={() => navigate(createPageUrl("Dashboard"))}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Terug naar Dashboard
              </Button>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['dogSnapshot', dogId] })}
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

  // Extract data from snapshot with safe fallbacks
  const dogData = snapshot?.dog || {};
  const sessionsData = snapshot?.trends?.sessions_last_6 || [];
  const weightsData = snapshot?.trends?.weight_last_6 || [];
  const goalsData = snapshot?.goals || [];
  const appointmentData = snapshot?.next_appointment;
  const currentState = snapshot?.current_state || {};
  const statistics = snapshot?.statistics || {};

  const defaultDogAvatar = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f3c7479ea85c36ceb42b10/27ff84f5c_Kwispelwandelt.jpg";

  const InfoRow = ({ icon: Icon, label, value }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex items-start gap-2 py-0.5">
        {Icon && <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--primary-pink)' }} />}
        <p className="text-sm text-gray-700 leading-tight">
          <span className="font-semibold" style={{ color: 'var(--primary-blue)' }}>{label}:</span> {value}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Back Button and Delete Button */}
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={() => navigate(createPageUrl("Dashboard"))}
          className="hover:bg-pink-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Terug naar Dashboard
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="rounded-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Verwijder Profiel
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
              <AlertDialogDescription>
                Dit zal het profiel van <strong>{dogData.naam}</strong> en alle bijbehorende sessies,
                gewichtsmetingen, doelen en afspraken permanent verwijderen. Deze actie kan niet ongedaan worden gemaakt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuleren</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteDogMutation.mutate(dogId)}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteDogMutation.isPending}
              >
                {deleteDogMutation.isPending ? 'Verwijderen...' : 'Ja, verwijder'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* HEADER REDESIGN */}
      <Card className="border-2 rounded-2xl shadow-lg overflow-hidden"
            style={{ borderColor: 'var(--primary-pink)' }}>
        <div className="relative" style={{ background: '#1D3C87', paddingTop: '20px', paddingBottom: '20px' }}>

          {/* Profiel Bewerken en Deel met baasje knoppen rechtsboven */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button 
              onClick={() => setShowShareModal(true)}
              className="rounded-full bg-white hover:bg-gray-50 shadow-lg"
              style={{ color: 'var(--primary-blue)' }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Deel met baasje
            </Button>
            <Link to={createPageUrl("EditHondenProfiel", `id=${dogId}`)}>
              <Button className="rounded-full bg-white hover:bg-gray-50 shadow-lg"
                      style={{ color: 'var(--primary-blue)' }}>
                <Edit className="w-4 h-4 mr-2" />
                Profiel Bewerken
              </Button>
            </Link>
          </div>

          {/* Status badges rechts uitgelijnd */}
          {dogData.status_tags && dogData.status_tags.length > 0 && (
            <div className="absolute right-4 bottom-4 flex flex-wrap gap-2 justify-end items-end z-10">
              {dogData.status_tags.map((tag) => (
                <Badge
                  key={tag}
                  className="rounded-full text-sm px-4 py-1.5"
                  style={{
                    backgroundColor: 'var(--primary-pink)',
                    color: 'var(--primary-blue)',
                    border: 'none'
                  }}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center px-8 gap-6 relative">
            {/* Ronde Profielfoto links */}
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl flex-shrink-0"
                 style={{ backgroundColor: 'white' }}>
              <img
                src={dogData.foto_url || defaultDogAvatar}
                alt={dogData.naam}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Naam, ras, geslacht, geboortejaar */}
            <div className="flex-1 flex items-center">
              <div>
                <h1 className="text-3xl font-bold text-white mb-0.5 leading-tight">{dogData.naam}</h1>
                <p className="text-white text-lg opacity-90 mb-1 leading-tight">{dogData.ras}</p>
                <div className="flex items-center gap-2 text-white opacity-80">
                  {dogData.geslacht === 'mannelijk' ? (
                    <span className="flex items-center gap-1 text-base">
                      <span>♂</span>
                      <span>Mannelijk</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-base">
                      <span>♀</span>
                      <span>Vrouwelijk</span>
                    </span>
                  )}
                  <span className="text-base">| °{dogData.geboortejaar || '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* DRIE BASISINFO KAARTEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Kaart 1: Basisinformatie */}
        <Card className="border-2 rounded-2xl shadow-md"
              style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 kwiek-heading text-base">
              <PawPrint className="w-5 h-5" style={{ color: 'var(--primary-pink)' }} />
              Basisinformatie
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-2">
            <InfoRow icon={User} label="Naam" value={dogData.naam} />
            <InfoRow icon={Tag} label="Ras" value={dogData.ras} />
            <InfoRow icon={Scissors} label="Gecastreerd/Gesteriliseerd" value={dogData.gecastreerd ? 'Ja' : 'Nee'} />
            <InfoRow icon={Weight} label="Startgewicht" value={dogData.start_weight_kg ? `${dogData.start_weight_kg} kg` : '-'} />
          </CardContent>
        </Card>

        {/* Kaart 2: Contact Baasje */}
        <Card className="border-2 rounded-2xl shadow-md"
              style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 kwiek-heading text-base">
              <Users className="w-5 h-5" style={{ color: 'var(--primary-pink)' }} />
              Contact Baasje
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-2">
            <InfoRow icon={User} label="Naam" value={dogData.baasje_naam} />
            <InfoRow icon={Mail} label="Email" value={dogData.baasje_email} />
            {dogData.baasje_telefoon && <InfoRow icon={Phone} label="Telefoon" value={dogData.baasje_telefoon} />}
            {(dogData.baasje_postcode || dogData.baasje_plaats) && (
              <InfoRow icon={MapPin} label="Adres" value={[dogData.baasje_postcode, dogData.baasje_plaats].filter(Boolean).join(' ')} />
            )}
          </CardContent>
        </Card>

        {/* Kaart 3: Afspraak Planning */}
        <Card className="border-2 rounded-2xl shadow-md"
              style={{ borderColor: appointmentData ? '#4ade80' : '#ef4444' }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 kwiek-heading text-base">
              <Calendar className="w-5 h-5" style={{ color: appointmentData ? '#4ade80' : '#ef4444' }} />
              Afspraak Planning
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {appointmentData ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-green-50 border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-700 leading-tight">Afspraak Gepland</p>
                    <p className="text-xs text-green-600 mt-0.5 leading-tight">
                      {format(new Date(appointmentData.datum_tijd), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
                    </p>
                  </div>
                </div>
                <Link to={createPageUrl("NieuweAfspraak", `dogId=${dogId}`)}>
                  <Button variant="outline" className="w-full rounded-xl border-2 h-9"
                          style={{ borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)' }}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Plan Nieuwe Afspraak
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-700 leading-tight">Nog Geen Afspraak</p>
                    <p className="text-xs text-red-600 mt-0.5 leading-tight">Plan een afspraak voor deze hond</p>
                  </div>
                </div>
                <Link to={createPageUrl("NieuweAfspraak", `dogId=${dogId}`)}>
                  <Button className="w-full rounded-xl h-9" style={{ backgroundColor: 'var(--primary-blue)' }}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Afspraak Plannen
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3B: ACTIEKNOPPEN (4 grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to={createPageUrl("NieuweSessie", `dogId=${dogId}`)}>
          <Button className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-2xl shadow-md hover:shadow-lg transition-all text-white"
                  style={{ backgroundColor: 'var(--primary-blue)' }}>
            <Plus className="w-7 h-7" />
            <span className="font-semibold text-sm">Nieuwe Sessie</span>
          </Button>
        </Link>

        <Link to={createPageUrl("NieuweGewicht", `dogId=${dogId}`)}>
          <Button variant="outline"
                  className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-2xl shadow-md hover:shadow-lg transition-all border-2"
                  style={{ borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)' }}>
            <Weight className="w-7 h-7" />
            <span className="font-semibold text-sm">Gewicht Toevoegen</span>
          </Button>
        </Link>

        <Button variant="outline"
                className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-2xl shadow-md hover:shadow-lg transition-all border-2"
                style={{ borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)' }}
                onClick={() => setShowAddGoalModal(true)}
                >
          <Target className="w-7 h-7" />
          <span className="font-semibold text-sm">Doel Toevoegen</span>
        </Button>

        <Link to={createPageUrl("NieuweAfspraak", `dogId=${dogId}`)}>
          <Button variant="outline"
                  className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-2xl shadow-md hover:shadow-lg transition-all border-2"
                  style={{ borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)' }}>
            <Calendar className="w-7 h-7" />
            <span className="font-semibold text-sm">Afspraak Plannen</span>
          </Button>
        </Link>
      </div>

      {/* 3B: STATISTIEKTEGELS (4 grid) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-2 rounded-2xl shadow-sm" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardContent className="p-5 text-center">
            <Activity className="w-9 h-9 mx-auto mb-2" style={{ color: 'var(--primary-blue)' }} />
            <p className="text-3xl font-bold mb-1" style={{ color: 'var(--primary-blue)' }}>
              {statistics.totaal_sessies || 0}
            </p>
            <p className="text-xs text-gray-600 font-medium">Totaal Sessies</p>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl shadow-sm" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardContent className="p-5 text-center">
            <Weight className="w-9 h-9 mx-auto mb-2" style={{ color: 'var(--primary-blue)' }} />
            <p className="text-3xl font-bold mb-1" style={{ color: 'var(--primary-blue)' }}>
              {statistics.totaal_gewichtsmetingen || 0}
            </p>
            <p className="text-xs text-gray-600 font-medium">Gewichtsmetingen</p>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl shadow-sm" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardContent className="p-5 text-center">
            <Target className="w-9 h-9 mx-auto mb-2" style={{ color: 'var(--primary-blue)' }} />
            <p className="text-3xl font-bold mb-1" style={{ color: 'var(--primary-blue)' }}>
              {statistics.actieve_doelen || 0}
            </p>
            <p className="text-xs text-gray-600 font-medium">Actieve Doelen</p>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl shadow-sm" style={{ borderColor: 'var(--primary-pink)' }}>
          <CardContent className="p-5 text-center">
            <Calendar className="w-9 h-9 mx-auto mb-2" style={{ color: 'var(--primary-blue)' }} />
            <p className="text-xl font-bold mb-1" style={{ color: 'var(--primary-blue)' }}>
              {currentState.laatste_sessie ? format(new Date(currentState.laatste_sessie.datum), 'd MMM yyyy', { locale: nl }) : '-'}
            </p>
            <p className="text-xs text-gray-600 font-medium">Laatste Sessie</p>
          </CardContent>
        </Card>
      </div>

      {/* 3C: TABNAVIGATIE MET ICONEN */}
      <Tabs defaultValue="overzicht" className="space-y-6">
        <TabsList className="w-full justify-start rounded-xl p-1 h-auto"
                  style={{ backgroundColor: 'var(--primary-pink)' }}>
          <TabsTrigger value="overzicht"
                       className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            Overzicht
          </TabsTrigger>
          <TabsTrigger value="huidig-advies"
                       className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Huidig Advies
          </TabsTrigger>
          <TabsTrigger value="gewicht"
                       className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
            <ChartIcon className="w-4 h-4" />
            Gewicht
          </TabsTrigger>
          <TabsTrigger value="alle-sessies"
                       className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
            <History className="w-4 h-4" />
            Alle Sessies
          </TabsTrigger>
          <TabsTrigger value="doelen"
                       className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
            <Crosshair className="w-4 h-4" />
            Doelen
          </TabsTrigger>
        </TabsList>

        {/* 3C: OVERZICHT TAB met 3 ACCORDIONS */}
        <TabsContent value="overzicht" className="space-y-4">
          <Accordion type="single" collapsible className="space-y-4">
            {/* Voeding Accordion */}
            <AccordionItem value="voeding"
                          className="border-2 rounded-2xl bg-white overflow-hidden"
                          style={{ borderColor: 'var(--primary-pink)' }}>
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: 'var(--primary-pink)' }}>
                    <Activity className="w-6 h-6" style={{ color: 'var(--primary-blue)' }} />
                  </div>
                  <span className="kwiek-heading text-xl">Voeding</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Huidige voeding</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.huidige_voeding || '-' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Hoeveelheid per dag</p>
                    <p className="text-sm text-gray-700">{dogData.hoeveelheid_voeding || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Bijvoeding/snacks</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.bijvoeding || '-' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Aantal voedingen per dag</p>
                    <p className="text-sm text-gray-700">{dogData.aantal_voedingen || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Eetgedrag</p>
                    <p className="text-sm text-gray-700 capitalize">{dogData.eetgedrag || '-'}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Gezondheid Accordion */}
            <AccordionItem value="gezondheid"
                          className="border-2 rounded-2xl bg-white overflow-hidden"
                          style={{ borderColor: 'var(--primary-pink)' }}>
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: 'var(--primary-pink)' }}>
                    <Activity className="w-6 h-6" style={{ color: 'var(--primary-blue)' }} />
                  </div>
                  <span className="kwiek-heading text-xl">Gezondheid</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Allergieën</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.allergieën || '-' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Medicatie</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.medicatie || '-' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Supplementen</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.supplementen || '-' }} />
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Huid en vacht</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.huid_en_vacht || '-' }} />
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Andere gezondheidsproblemen</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.andere_gezondheidsproblemen || '-' }} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Gedrag & Activiteit Accordion */}
            <AccordionItem value="gedrag"
                          className="border-2 rounded-2xl bg-white overflow-hidden"
                          style={{ borderColor: 'var(--primary-pink)' }}>
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center"
                       style={{ backgroundColor: 'var(--primary-pink)' }}>
                    <PawPrint className="w-6 h-6" style={{ color: 'var(--primary-blue)' }} />
                  </div>
                  <span className="kwiek-heading text-xl">Gedrag & Activiteit</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Dagelijkse activiteit</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.dagelijkse_activiteit || '-' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Karakter</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.karakter || '-' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Ongewenst gedrag</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.ongewenst_gedrag || '-' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Gras eten</p>
                    <p className="text-sm text-gray-700 capitalize">{dogData.gras_eten?.replace('_', ' ') || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Ontlasting</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.ontlasting_samenvatting || '-' }} />
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Aanvullingen</p>
                    <div className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: dogData.aanvullingen || '-' }} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* HUIDIG ADVIES TAB */}
        <TabsContent value="huidig-advies">
          {currentState.huidig_advies ? (
            <Card className="border-2 rounded-2xl shadow-md" style={{ borderColor: 'var(--primary-blue)' }}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="kwiek-heading text-2xl">Huidig Advies voor {dogData.naam}</CardTitle>
                    {currentState.laatste_sessie && (
                      <p className="text-sm text-gray-600 mt-1">
                        Opgesteld op {format(new Date(currentState.laatste_sessie.datum), 'd MMMM yyyy', { locale: nl })}
                      </p>
                    )}
                    {currentState.laatste_sessie?.gewicht_kg && (
                      <p className="text-sm text-gray-600 mt-1">
                        Gewicht bij deze sessie: {currentState.laatste_sessie.gewicht_kg} kg
                      </p>
                    )}
                  </div>
                  <Badge className="rounded-full" style={{ backgroundColor: 'var(--primary-pink)', color: 'var(--primary-blue)' }}>
                    Actueel
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-blue max-w-none"
                  style={{
                    '--tw-prose-headings': 'var(--primary-blue)',
                    '--tw-prose-links': 'var(--primary-blue)',
                    '--tw-prose-bold': 'var(--primary-blue)',
                  }}
                  dangerouslySetInnerHTML={{ __html: currentState.huidig_advies }}
                />

                <div className="mt-8 pt-6 border-t-2 flex gap-4" style={{ borderColor: 'var(--primary-pink)' }}>
                  <Link to={createPageUrl("NieuweSessie", `dogId=${dogId}`)}>
                    <Button className="rounded-full shadow-lg hover:shadow-xl transition-all"
                            style={{ backgroundColor: 'var(--primary-blue)' }}>
                      <Plus className="w-5 h-5 mr-2" />
                      Nieuwe Sessie
                    </Button>
                  </Link>
                  {currentState.laatste_sessie?.id && (
                    <Link to={createPageUrl("BewerkSessie", `id=${currentState.laatste_sessie.id}&dogId=${dogId}`)}>
                      <Button variant="outline"
                              className="rounded-full shadow-lg hover:shadow-xl transition-all"
                              style={{ borderColor: 'var(--primary-blue)', color: 'var(--primary-blue)' }}>
                        <Edit className="w-5 h-5 mr-2" />
                        Bewerk Laatste Sessie
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30"
                         style={{ color: 'var(--primary-blue)' }} />
                <p className="text-xl font-medium mb-2" style={{ color: 'var(--primary-blue)' }}>
                  Nog geen voedingsadvies beschikbaar
                </p>
                <p className="text-gray-600 mb-6">
                  Er is nog geen voedingsadvies vastgelegd voor {dogData.naam}
                </p>
                <Link to={createPageUrl("NieuweSessie", `dogId=${dogId}`)}>
                  <Button className="rounded-full shadow-lg hover:shadow-xl transition-all"
                          style={{ backgroundColor: 'var(--primary-blue)' }}>
                    <Plus className="w-5 h-5 mr-2" />
                    Eerste Sessie Toevoegen
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* GEWICHT TAB */}
        <TabsContent value="gewicht">
          <WeightChart weights={weightsData} dogName={dogData.naam} />
        </TabsContent>

        {/* ALLE SESSIES TAB */}
        <TabsContent value="alle-sessies">
          <SessionTimeline sessions={sessionsData} dogId={dogId} />
        </TabsContent>

        {/* DOELEN TAB */}
        <TabsContent value="doelen">
          <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="kwiek-heading">Doelen</CardTitle>
                <Button
                  onClick={() => setShowAddGoalModal(true)}
                  className="rounded-full shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: 'var(--primary-blue)' }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Doel Toevoegen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {goalsData.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 mx-auto mb-4 opacity-30"
                         style={{ color: 'var(--primary-blue)' }} />
                  <p className="text-xl font-medium mb-2" style={{ color: 'var(--primary-blue)' }}>
                    Nog geen doelen ingesteld
                  </p>
                  <p className="text-gray-600 mb-6">
                    Start met het toevoegen van doelen om de voortgang van {dogData.naam} te volgen
                  </p>
                  <Button
                    onClick={() => setShowAddGoalModal(true)}
                    className="rounded-full shadow-lg hover:shadow-xl transition-all"
                    style={{ backgroundColor: 'var(--primary-blue)' }}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Eerste Doel Toevoegen
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {goalsData.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      snapshot={snapshot}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Goal Modal */}
      <AddGoalModal
        isOpen={showAddGoalModal}
        onClose={() => setShowAddGoalModal(false)}
        dogId={dogId}
        snapshot={snapshot}
      />

      {/* Share Profile Modal */}
      <ShareProfileModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        dog={dogData}
      />
    </div>
  );
}
