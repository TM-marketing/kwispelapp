
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity,
  Weight,
  PawPrint,
  Users,
  User,
  Tag,
  Scissors,
  LayoutGrid,
  MessageSquare,
  TrendingUp as ChartIcon,
  History,
  Crosshair,
  Loader2,
  Lock,
  Phone,
  MapPin,
  LogOut,
  Target,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";

import WeightChart from "../components/profiel/WeightChart";
import SessionTimeline from "../components/profiel/SessionTimeline";
import GoalCard from "../components/goals/GoalCard";

export default function HondenProfielGastpas() {
  console.log('=== HondenProfielGastpas COMPONENT RENDER ===');
  
  // Extract slug from URL
  const getSlugFromUrl = () => {
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    const gastpasIndex = parts.indexOf('gastpas');
    
    if (gastpasIndex !== -1 && parts[gastpasIndex + 1]) {
      return parts[gastpasIndex + 1];
    }
    return null;
  };

  const slug = getSlugFromUrl();
  console.log('Slug:', slug);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const [dogId, setDogId] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  // Check session storage for authentication
  useEffect(() => {
    if (!slug) return;
    
    const authKey = `gastpas_auth_${slug}`;
    const storedAuth = sessionStorage.getItem(authKey);
    
    if (storedAuth) {
      console.log('Found stored auth, dogId:', storedAuth);
      setIsAuthenticated(true);
      setDogId(storedAuth);
    }
  }, [slug]);

  // Handle authentication via backend function
  const handleAuthenticate = async (e) => {
    e.preventDefault();
    console.log('=== AUTHENTICATION ATTEMPT ===');
    setAuthError(null);
    setIsValidating(true);

    try {
      // Call PUBLIC validation function
      const response = await base44.functions.invoke('validateGastpasLogin', {
        slug,
        password
      });

      console.log('Validation response:', response);

      if (response?.data?.valid) {
        console.log('✓ Authentication successful! DogId:', response.data.dogId);
        
        const authKey = `gastpas_auth_${slug}`;
        sessionStorage.setItem(authKey, response.data.dogId);
        
        setDogId(response.data.dogId);
        setIsAuthenticated(true);
        setPassword('');
      } else {
        console.error('Authentication failed:', response?.data?.error);
        setAuthError(response?.data?.error || 'Onjuist wachtwoord');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setAuthError('Er is een fout opgetreden. Probeer het opnieuw.');
    } finally {
      setIsValidating(false);
    }
  };

  // Logout
  const handleLogout = () => {
    console.log('Logging out...');
    try {
      const authKey = `gastpas_auth_${slug}`;
      sessionStorage.removeItem(authKey);
      setIsAuthenticated(false);
      setPassword('');
      setDogId(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Fetch snapshot via PUBLIC backend function
  const { data: snapshot, isLoading, error } = useQuery({
    queryKey: ['gastpasData', dogId],
    queryFn: async () => {
      console.log('=== FETCHING GASTPAS DATA ===');
      console.log('Dog ID:', dogId);
      
      if (!dogId) {
        throw new Error('Geen hond ID');
      }
      
      // Call PUBLIC data function
      const response = await base44.functions.invoke('getGastpasData', { dogId });
      
      console.log('Data response received');
      
      if (!response?.data) {
        throw new Error('Geen data ontvangen');
      }
      
      return response.data;
    },
    enabled: isAuthenticated && !!dogId,
    retry: 1,
    staleTime: 60 * 1000,
  });

  console.log('State:', { slug, isAuthenticated, dogId, isLoading, hasSnapshot: !!snapshot, queryError: error?.message });

  // NO SLUG
  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" 
           style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #fce4ec 100%)' }}>
        <Card className="w-full max-w-md border-2 rounded-2xl shadow-xl border-red-300">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-red-700 mb-2">Ongeldige Link</h2>
            <p className="text-gray-600 mb-4">
              Deze link is niet geldig of onvolledig. Controleer de link die je hebt ontvangen.
            </p>
            <p className="text-sm text-gray-500">
              Vraag de link opnieuw op bij je voedingsadviseur.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" 
           style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #fce4ec 100%)' }}>
        <Card className="w-full max-w-md border-2 rounded-2xl shadow-xl" 
              style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center overflow-hidden"
                 style={{ backgroundColor: 'var(--primary-pink)' }}>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f3c7479ea85c36ceb42b10/c4b5fd1bd_5108122c1_Favicon-Kwiekenkwispel.png"
                alt="Kwiek & Kwispel"
                className="w-16 h-16 object-contain"
              />
            </div>
            <CardTitle className="kwiek-heading text-2xl">Kwiek & Kwispel</CardTitle>
            <p className="text-gray-600 mt-2">Toegang tot hondenprofiel</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuthenticate} className="space-y-4">
              {authError && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="password">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Wachtwoord
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Voer je wachtwoord in"
                  className="rounded-xl border-2"
                  style={{ borderColor: 'var(--primary-pink)' }}
                  required
                  autoFocus
                  disabled={isValidating}
                />
                <p className="text-xs text-gray-500">
                  Je hebt dit wachtwoord ontvangen van je voedingsadviseur
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full rounded-xl"
                style={{ backgroundColor: 'var(--primary-blue)' }}
                disabled={isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Controleren...
                  </>
                ) : (
                  'Inloggen'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // LOADING
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" 
           style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #fce4ec 100%)' }}>
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{ color: 'var(--primary-blue)' }} />
          <p className="text-lg" style={{ color: 'var(--primary-blue)' }}>Profiel laden...</p>
        </div>
      </div>
    );
  }

  // ERROR
  if (error || !snapshot || !snapshot.dog) {
    console.error('RENDER ERROR:', error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4" 
           style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #fce4ec 100%)' }}>
        <Card className="w-full max-w-md border-2 rounded-2xl shadow-xl border-red-300">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-bold text-red-700 mb-2">Fout bij laden</h2>
            <p className="text-gray-600 mb-6">{error?.message || 'Er is een fout opgetreden bij het laden van het profiel'}</p>
            <Button onClick={handleLogout} className="w-full rounded-xl" style={{ backgroundColor: 'var(--primary-blue)' }}>
              <LogOut className="w-4 h-4 mr-2" />
              Terug naar login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('✓ RENDER: Main profile view');

  const dogData = snapshot.dog;
  const sessionsData = snapshot.trends?.sessions_last_6 || [];
  const weightsData = snapshot.trends?.weight_last_6 || [];
  const goalsData = snapshot.goals || [];
  const currentState = snapshot.current_state || {};
  const statistics = snapshot.statistics || {};

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
    <div className="max-w-7xl mx-auto space-y-6 p-6" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #fce4ec 100%)', minHeight: '100vh' }}>
      
      {/* Logout Button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleLogout}
          className="rounded-full"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Uitloggen
        </Button>
      </div>

      {/* HEADER */}
      <Card className="border-2 rounded-2xl shadow-lg overflow-hidden"
            style={{ borderColor: 'var(--primary-pink)' }}>
        <div className="relative" style={{ background: '#1D3C87', paddingTop: '20px', paddingBottom: '20px' }}>

          {/* Status badges */}
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
            {/* Profile Photo */}
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl flex-shrink-0"
                 style={{ backgroundColor: 'white' }}>
              <img
                src={dogData.foto_url || defaultDogAvatar}
                alt={dogData.naam || 'Hond'}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Name, breed, etc */}
            <div className="flex-1 flex items-center">
              <div>
                <h1 className="text-3xl font-bold text-white mb-0.5 leading-tight">{dogData.naam || '-'}</h1>
                <p className="text-white text-lg opacity-90 mb-1 leading-tight">{dogData.ras || '-'}</p>
                <div className="flex items-center gap-2 text-white opacity-80">
                  {dogData.geslacht === 'mannelijk' ? (
                    <span className="flex items-center gap-1 text-base">
                      <span>♂</span>
                      <span>Mannelijk</span>
                    </span>
                  ) : dogData.geslacht === 'vrouwelijk' ? (
                    <span className="flex items-center gap-1 text-base">
                      <span>♀</span>
                      <span>Vrouwelijk</span>
                    </span>
                  ) : null}
                  {dogData.geboortejaar && (
                    <span className="text-base">| °{dogData.geboortejaar}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <Card className="border-2 rounded-2xl shadow-md"
              style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 kwiek-heading text-base">
              <Users className="w-5 h-5" style={{ color: 'var(--primary-pink)' }} />
              Contact Eigenaar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-2">
            <InfoRow icon={User} label="Naam" value={dogData.baasje_naam} />
            {dogData.baasje_telefoon && <InfoRow icon={Phone} label="Telefoon" value={dogData.baasje_telefoon} />}
            {(dogData.baasje_postcode || dogData.baasje_plaats) && (
              <InfoRow icon={MapPin} label="Adres" value={[dogData.baasje_postcode, dogData.baasje_plaats].filter(Boolean).join(' ')} />
            )}
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl shadow-md"
              style={{ borderColor: 'var(--primary-pink)' }}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 kwiek-heading text-base">
              <Activity className="w-5 h-5" style={{ color: 'var(--primary-pink)' }} />
              Snelle Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Totaal Sessies</span>
              <span className="text-lg font-bold" style={{ color: 'var(--primary-blue)' }}>
                {statistics.totaal_sessies || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Actieve Doelen</span>
              <span className="text-lg font-bold" style={{ color: 'var(--primary-blue)' }}>
                {statistics.actieve_doelen || 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="huidig-advies" className="space-y-6">
        <TabsList className="w-full justify-start rounded-xl p-1 h-auto flex-wrap"
                  style={{ backgroundColor: 'var(--primary-pink)' }}>
          <TabsTrigger value="huidig-advies"
                       className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Huidig Advies
          </TabsTrigger>
          <TabsTrigger value="gewicht"
                       className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white flex items-center gap-2">
            <ChartIcon className="w-4 h-4" />
            Gewicht
          </TabsTrigger>
          <TabsTrigger value="alle-sessies"
                       className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white flex items-center gap-2">
            <History className="w-4 h-4" />
            Alle Sessies
          </TabsTrigger>
          <TabsTrigger value="doelen"
                       className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white flex items-center gap-2">
            <Crosshair className="w-4 h-4" />
            Doelen
          </TabsTrigger>
          <TabsTrigger value="overzicht"
                       className="rounded-lg px-5 py-2.5 data-[state=active]:bg-white flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            Overzicht
          </TabsTrigger>
        </TabsList>

        {/* HUIDIG ADVIES TAB */}
        <TabsContent value="huidig-advies">
          {currentState.huidig_advies ? (
            <Card className="border-2 rounded-2xl shadow-md" style={{ borderColor: 'var(--primary-blue)' }}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="kwiek-heading text-2xl">Huidig Advies voor {dogData.naam}</CardTitle>
                    {currentState.laatste_sessie?.datum && (
                      <p className="text-sm text-gray-600 mt-1">
                        Opgesteld op {format(new Date(currentState.laatste_sessie.datum), 'd MMMM yyyy', { locale: nl })}
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
              <CardTitle className="kwiek-heading">Doelen</CardTitle>
            </CardHeader>
            <CardContent>
              {goalsData.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 mx-auto mb-4 opacity-30"
                         style={{ color: 'var(--primary-blue)' }} />
                  <p className="text-xl font-medium mb-2" style={{ color: 'var(--primary-blue)' }}>
                    Nog geen doelen ingesteld
                  </p>
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

        {/* OVERZICHT TAB */}
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
      </Tabs>
    </div>
  );
}
