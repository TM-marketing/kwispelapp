
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, MapPin, Clock, PawPrint, Filter, ChevronLeft, ChevronRight, Plus, Edit, X, CheckCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, addWeeks, isSameMonth, isSameDay, isPast, isFuture, isToday, parseISO, isValid } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AddToCalendar from "../components/calendar/AddToCalendar";

export default function Agenda() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month"); // month, week, day
  const [filterStatus, setFilterStatus] = useState("alle");
  const [filterType, setFilterType] = useState("alle");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null); // Nieuw: voor sessie detail popup
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => base44.entities.Appointment.list('datum_tijd'),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list('-datum'),
  });

  const { data: dogs = [] } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => base44.entities.Dog.list(),
  });

  // Create dog lookup map
  const dogMap = useMemo(() => {
    const map = {};
    dogs.forEach(dog => {
      map[dog.id] = dog;
    });
    return map;
  }, [dogs]);

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: (appointmentId) => base44.entities.Appointment.update(appointmentId, { status: 'geannuleerd' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelectedEvent(null);
      setShowCancelDialog(false);
    },
  });

  // Transform appointments and sessions into calendar events
  const allEvents = useMemo(() => {
    const events = [];
    
    // Process appointments
    appointments.forEach(apt => {
      if (!apt.datum_tijd) return; // Skip if date is missing
      try {
        const date = parseISO(apt.datum_tijd);
        if (isValid(date)) { // Only add if date is valid
          events.push({
            id: `apt-${apt.id}`,
            type: 'appointment',
            date: date,
            title: dogMap[apt.dog_id]?.naam || 'Onbekende hond',
            dog: dogMap[apt.dog_id],
            data: apt,
            status: apt.status,
            sessionType: null
          });
        } else {
          console.error('Invalid appointment date:', apt.datum_tijd, apt);
        }
      } catch (e) {
        console.error('Error parsing appointment date:', apt.datum_tijd, e, apt);
      }
    });
    
    // Process sessions
    sessions.forEach(ses => {
      if (!ses.datum) return; // Skip if date is missing
      try {
        const date = parseISO(ses.datum);
        if (isValid(date)) { // Only add if date is valid
          events.push({
            id: `ses-${ses.id}`,
            type: 'session',
            date: date,
            title: dogMap[ses.dog_id]?.naam || 'Onbekende hond',
            dog: dogMap[ses.dog_id],
            data: ses,
            status: ses.status === 'final' ? 'voltooid' : 'draft', // Standardize session status
            sessionType: ses.type
          });
        } else {
          console.error('Invalid session date:', ses.datum, ses);
        }
      } catch (e) {
        console.error('Error parsing session date:', ses.datum, e, ses);
      }
    });
    
    return events;
  }, [appointments, sessions, dogMap]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      const statusMatch = filterStatus === "alle" || 
        (filterStatus === "gepland" && event.status === "gepland") ||
        (filterStatus === "voltooid" && event.status === "voltooid") ||
        (filterStatus === "geannuleerd" && event.status === "geannuleerd");
      
      const typeMatch = filterType === "alle" ||
        (filterType === "afspraak" && event.type === "appointment") ||
        (filterType === "intake" && event.sessionType === "intake") ||
        (filterType === "opvolging" && event.sessionType === "opvolging");

      return statusMatch && typeMatch;
    });
  }, [allEvents, filterStatus, filterType]);

  // Calculate statistics
  const stats = useMemo(() => {
    return {
      komende: allEvents.filter(e => isFuture(e.date) && (e.status === 'gepland' || e.status === 'draft')).length,
      vandaag: allEvents.filter(e => isToday(e.date)).length,
      voorbij: allEvents.filter(e => isPast(e.date) && !isToday(e.date)).length,
      geannuleerd: appointments.filter(a => a.status === 'geannuleerd').length,
      totaal: allEvents.length
    };
  }, [allEvents, appointments]);

  // Navigation handlers
  const goToPrevious = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, -1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, -1));
    else setCurrentDate(addDays(currentDate, -1));
  };

  const goToNext = () => {
    if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => setCurrentDate(new Date());

  // Event click handler - AANGEPAST
  const handleEventClick = (event) => {
    if (event.type === 'session') {
      // Voor sessies: open direct de SessionTimeline detail popup
      setSelectedSession(event.data);
    } else {
      // Voor afspraken: open de afspraak modal
      setSelectedEvent(event);
    }
  };

  // Calendar rendering helpers
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: nl });
    const endDate = endOfWeek(monthEnd, { locale: nl });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = new Date(day); // Create a clone to ensure a stable key and avoid mutation issues
        const dayEvents = filteredEvents.filter(e => isSameDay(e.date, cloneDay));
        
        days.push(
          <div
            key={cloneDay.toISOString()} // Use ISO string for stable unique key
            className={`min-h-[120px] border border-gray-200 p-2 ${
              !isSameMonth(cloneDay, monthStart) ? 'bg-gray-50 text-gray-400' : 'bg-white'
            } ${isToday(cloneDay) ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="font-semibold text-sm mb-1">{format(cloneDay, 'd')}</div>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map(event => (
                <button
                  key={event.id}
                  onClick={() => handleEventClick(event)}
                  className={`w-full text-left text-xs px-2 py-1 rounded truncate ${
                    event.type === 'appointment' 
                      ? event.status === 'gepland' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : event.status === 'geannuleerd' ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : event.sessionType === 'intake' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {format(event.date, 'HH:mm')} {event.title}
                </button>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500 px-2">+{dayEvents.length - 3} meer</div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={`row-${day.toISOString()}`} className="grid grid-cols-7 gap-0"> {/* Use ISO string for stable unique key */}
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="space-y-0">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-0 bg-gray-100">
          {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map(day => (
            <div key={day} className="p-2 text-center font-semibold text-sm border border-gray-200">
              {day}
            </div>
          ))}
        </div>
        {rows}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate, { locale: nl });
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayEvents = filteredEvents.filter(e => isSameDay(e.date, day));
      
      days.push(
        <div key={day.toISOString()} className="flex-1 border-r border-gray-200 last:border-r-0">
          <div className={`p-3 text-center border-b border-gray-200 ${isToday(day) ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <div className="font-semibold">{format(day, 'EEE', { locale: nl })}</div>
            <div className={`text-2xl ${isToday(day) ? 'text-blue-600' : ''}`}>{format(day, 'd')}</div>
          </div>
          <div className="p-2 space-y-2 min-h-[400px]">
            {dayEvents.map(event => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event)}
                className={`w-full text-left text-sm px-3 py-2 rounded ${
                  event.type === 'appointment' 
                    ? event.status === 'gepland' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : event.status === 'geannuleerd' ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : event.sessionType === 'intake' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <div className="font-semibold">{format(event.date, 'HH:mm')}</div>
                <div className="truncate">{event.title}</div>
              </button>
            ))}
          </div>
        </div>
      );
    }

    return <div className="flex border border-gray-200">{days}</div>;
  };

  const renderDayView = () => {
    const dayEvents = filteredEvents.filter(e => isSameDay(e.date, currentDate));
    
    return (
      <div className="border border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="text-2xl font-bold">{format(currentDate, 'EEEE d MMMM yyyy', { locale: nl })}</div>
        </div>
        <div className="p-4 space-y-3">
          {dayEvents.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Geen afspraken of sessies op deze dag</p>
            </div>
          ) : (
            dayEvents.map(event => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event)}
                className={`w-full text-left p-4 rounded-lg border-2 ${
                  event.type === 'appointment' 
                    ? event.status === 'gepland' ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                      : event.status === 'geannuleerd' ? 'border-red-200 bg-red-50 hover:bg-red-100'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    : event.sessionType === 'intake' ? 'border-purple-200 bg-purple-50 hover:bg-purple-100'
                    : 'border-green-200 bg-green-50 hover:bg-green-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-lg">{event.title}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      {format(event.date, 'HH:mm')} • {event.type === 'appointment' ? 'Afspraak' : event.sessionType === 'intake' ? 'Intake' : 'Opvolging'}
                    </div>
                  </div>
                  <Badge className={`${
                    event.status === 'gepland' ? 'bg-blue-500' :
                    event.status === 'geannuleerd' ? 'bg-red-500' :
                    'bg-gray-500'
                  } text-white`}>
                    {event.status === 'gepland' ? 'Gepland' : 
                     event.status === 'geannuleerd' ? 'Geannuleerd' : 'Voltooid'}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  const locatieLabels = {
    kliniek: 'Kliniek',
    telefoon: 'Telefoon',
    video: 'Video',
    thuisbezoek: 'Thuisbezoek'
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="kwiek-heading text-3xl md:text-4xl">Agenda</h1>
          <p className="text-gray-600 mt-1">Overzicht van alle afspraken en sessies</p>
        </div>
        <Link to={createPageUrl("NieuweAfspraak")}>
          <Button className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                  style={{ backgroundColor: 'var(--primary-blue)' }}>
            <Plus className="w-5 h-5 mr-2" />
            Nieuwe Afspraak
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-2 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300"
              style={{ borderColor: 'var(--primary-pink)' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-5 h-5" style={{ color: 'var(--primary-blue)' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--primary-blue)' }}>
              {stats.komende}
            </p>
            <p className="text-sm text-gray-600">Komende</p>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300"
              style={{ borderColor: 'var(--primary-pink)' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-5 h-5" style={{ color: 'var(--primary-blue)' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--primary-blue)' }}>
              {stats.vandaag}
            </p>
            <p className="text-sm text-gray-600">Vandaag</p>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300"
              style={{ borderColor: 'var(--primary-pink)' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--primary-blue)' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--primary-blue)' }}>
              {stats.voorbij}
            </p>
            <p className="text-sm text-gray-600">Voorbij</p>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300"
              style={{ borderColor: 'var(--primary-pink)' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <X className="w-5 h-5" style={{ color: 'var(--primary-blue)' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--primary-blue)' }}>
              {stats.geannuleerd}
            </p>
            <p className="text-sm text-gray-600">Geannuleerd</p>
          </CardContent>
        </Card>

        <Card className="border-2 rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300"
              style={{ borderColor: 'var(--primary-pink)' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <PawPrint className="w-5 h-5" style={{ color: 'var(--primary-blue)' }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: 'var(--primary-blue)' }}>
              {stats.totaal}
            </p>
            <p className="text-sm text-gray-600">Totaal</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="border-2 rounded-2xl shadow-md" style={{ borderColor: 'var(--primary-pink)' }}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* View Selector */}
            <div className="flex gap-2">
              <Button
                variant={view === "month" ? "default" : "outline"}
                onClick={() => setView("month")}
                className="rounded-lg"
                style={view === "month" ? { backgroundColor: 'var(--primary-blue)' } : {}}
              >
                Maand
              </Button>
              <Button
                variant={view === "week" ? "default" : "outline"}
                onClick={() => setView("week")}
                className="rounded-lg"
                style={view === "week" ? { backgroundColor: 'var(--primary-blue)' } : {}}
              >
                Week
              </Button>
              <Button
                variant={view === "day" ? "default" : "outline"}
                onClick={() => setView("day")}
                className="rounded-lg"
                style={view === "day" ? { backgroundColor: 'var(--primary-blue)' } : {}}
              >
                Dag
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevious} className="rounded-lg">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={goToToday} className="rounded-lg px-4">
                Vandaag
              </Button>
              <Button variant="outline" size="icon" onClick={goToNext} className="rounded-lg">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="ml-4 font-semibold text-lg" style={{ color: 'var(--primary-blue)' }}>
                {view === "month" && format(currentDate, 'MMMM yyyy', { locale: nl })}
                {view === "week" && `Week ${format(currentDate, 'w, yyyy', { locale: nl })}`}
                {view === "day" && format(currentDate, 'd MMMM yyyy', { locale: nl })}
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-5 h-5 text-gray-400" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 rounded-lg border-2" style={{ borderColor: 'var(--primary-pink)' }}>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Status</SelectItem>
                  <SelectItem value="gepland">Gepland</SelectItem>
                  <SelectItem value="voltooid">Voltooid</SelectItem>
                  <SelectItem value="geannuleerd">Geannuleerd</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 rounded-lg border-2" style={{ borderColor: 'var(--primary-pink)' }}>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alle">Alle Types</SelectItem>
                  <SelectItem value="afspraak">Afspraken</SelectItem>
                  <SelectItem value="intake">Intake</SelectItem>
                  <SelectItem value="opvolging">Opvolging</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card className="border-2 rounded-2xl shadow-md overflow-hidden" style={{ borderColor: 'var(--primary-pink)' }}>
        <CardContent className="p-0">
          {view === "month" && renderMonthView()}
          {view === "week" && renderWeekView()}
          {view === "day" && renderDayView()}
        </CardContent>
      </Card>

      {/* Appointment Detail Dialog - AANGEPAST */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="kwiek-heading text-2xl">
                  Afspraak Details
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Dog Info */}
                {selectedEvent.dog && (
                  <Link to={createPageUrl("HondenProfiel", `id=${selectedEvent.dog.id}`)}>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer">
                      <PawPrint className="w-6 h-6" style={{ color: 'var(--primary-blue)' }} />
                      <div>
                        <p className="font-semibold" style={{ color: 'var(--primary-blue)' }}>
                          {selectedEvent.dog.naam}
                        </p>
                        <p className="text-sm text-gray-600">{selectedEvent.dog.ras}</p>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Date & Time */}
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-5 h-5" />
                  <span className="font-medium">
                    {format(selectedEvent.date, "EEEE d MMMM yyyy 'om' HH:mm", { locale: nl })}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin className="w-5 h-5" />
                  <span>{locatieLabels[selectedEvent.data.locatie] || selectedEvent.data.locatie}</span>
                </div>

                {/* Duration */}
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-5 h-5" />
                  <span>{selectedEvent.data.duur_minuten || 60} minuten</span>
                </div>

                {/* Note */}
                {selectedEvent.data.notitie && (
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Notitie:</p>
                    <p className="text-sm text-gray-700">{selectedEvent.data.notitie}</p>
                  </div>
                )}

                {/* Add to Calendar - alleen voor geplande afspraken */}
                {selectedEvent.status === 'gepland' && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-semibold mb-3" style={{ color: 'var(--primary-blue)' }}>
                      Voeg toe aan kalender:
                    </p>
                    <AddToCalendar
                      title={`Kwiek & Kwispel: Afspraak ${selectedEvent.title}`}
                      startLocal={format(selectedEvent.date, "yyyy-MM-dd'T'HH:mm")}
                      durationMinutes={selectedEvent.data.duur_minuten || 60}
                      timezone="Europe/Brussels"
                      description={selectedEvent.data.notitie || `Afspraak voor voedingsadvies`}
                      location={locatieLabels[selectedEvent.data.locatie] || selectedEvent.data.locatie}
                    />
                  </div>
                )}

                {/* Action Buttons - AANGEPAST */}
                <div className="flex gap-3 pt-4 border-t">
                  <Link to={createPageUrl("NieuweAfspraak", `id=${selectedEvent.data.id}`)} className="flex-1">
                    <Button variant="outline" className="rounded-lg w-full">
                      <Edit className="w-4 h-4 mr-2" />
                      Bewerken
                    </Button>
                  </Link>
                  {selectedEvent.status === 'gepland' && (
                    <Button
                      variant="destructive"
                      onClick={() => setShowCancelDialog(true)}
                      className="rounded-lg flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Annuleren
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Detail Dialog - NIEUW: Hergebruik van SessionTimeline detail popup */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="kwiek-heading text-2xl">
              Sessie Details - {selectedSession && format(new Date(selectedSession.datum), 'd MMMM yyyy', { locale: nl })}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-6">
              {/* Basis Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Type</p>
                  <Badge className="rounded-full" style={{ 
                      backgroundColor: selectedSession.type === 'intake' ? 'var(--primary-blue)' : 'var(--primary-pink)',
                      color: selectedSession.type === 'intake' ? 'white' : 'var(--primary-blue)'
                    }}>
                    {selectedSession.type === 'intake' ? 'Intake' : 'Opvolging'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--primary-blue)' }}>Locatie</p>
                  <p className="text-gray-700">{locatieLabels[selectedSession.locatie]}</p>
                </div>
              </div>

              {/* Gewicht */}
              {selectedSession.gewicht_kg && (
                <div>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--primary-blue)' }}>Gewicht</p>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                      {selectedSession.gewicht_kg} kg
                    </p>
                    {selectedSession.gewicht_notitie && (
                      <p className="text-sm text-gray-600 mt-1">{selectedSession.gewicht_notitie}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Symptoomscores */}
              {selectedSession.symptoom_scores && Object.keys(selectedSession.symptoom_scores).length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-3" style={{ color: 'var(--primary-blue)' }}>Symptoomscores</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(selectedSession.symptoom_scores).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-medium capitalize">{key}</p>
                          <p className="text-lg font-bold" style={{ color: 'var(--primary-blue)' }}>{value}/10</p>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              width: `${(value / 10) * 100}%`,
                              backgroundColor: value <= 3 ? '#10b981' : value <= 6 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resultaatscores */}
              {selectedSession.resultaat_scores && Object.keys(selectedSession.resultaat_scores).length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-3" style={{ color: 'var(--primary-blue)' }}>Resultaten t.o.v. Vorige Sessie</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.entries(selectedSession.resultaat_scores).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Badge 
                          className="rounded-full"
                          style={{
                            backgroundColor: value === 'verbeterd' ? '#10b981' : value === 'verslechterd' ? '#ef4444' : '#6b7280',
                            color: 'white'
                          }}
                        >
                          {value === 'verbeterd' ? '↑' : value === 'verslechterd' ? '↓' : '→'}
                        </Badge>
                        <span className="text-sm capitalize">{key}: {value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advies */}
              {selectedSession.nieuw_advies && (
                <div>
                  <p className="text-sm font-semibold mb-3" style={{ color: 'var(--primary-blue)' }}>Voedingsadvies</p>
                  <div 
                    className="prose prose-sm max-w-none p-4 rounded-lg bg-gray-50"
                    dangerouslySetInnerHTML={{ __html: selectedSession.nieuw_advies }}
                  />
                </div>
              )}

              {/* Expert */}
              {selectedSession.expert_naam && (
                <div className="text-sm text-gray-500 pt-4 border-t">
                  Door: {selectedSession.expert_naam}
                </div>
              )}

              {/* Bewerken knop */}
              <div className="flex justify-end pt-4 border-t">
                <Link to={createPageUrl("BewerkSessie", `id=${selectedSession.id}&dogId=${selectedSession.dog_id}`)}>
                  <Button variant="outline" className="rounded-lg">
                    <Edit className="w-4 h-4 mr-2" />
                    Sessie Bewerken
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Afspraak Annuleren?</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Weet je zeker dat je deze afspraak wilt annuleren? Deze actie wordt geregistreerd maar de afspraak blijft zichtbaar in de agenda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Terug</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedEvent && cancelAppointmentMutation.mutate(selectedEvent.data.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Ja, Annuleer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
