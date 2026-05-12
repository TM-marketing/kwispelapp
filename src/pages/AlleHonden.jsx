
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, AlertCircle, Filter, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AlleHonden() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTag, setFilterTag] = useState("all");

  const { data: dogs, isLoading } = useQuery({
    queryKey: ['dogs'],
    queryFn: () => base44.entities.Dog.list('-created_date'),
    initialData: [],
  });

  const { data: upcomingAppointments } = useQuery({
    queryKey: ['upcomingAppointments'],
    queryFn: async () => {
      const all = await base44.entities.Appointment.list('-datum_tijd');
      const now = new Date();
      return all.filter(apt => 
        new Date(apt.datum_tijd) > now && 
        apt.status === 'gepland'
      );
    },
    initialData: [],
  });

  // Create a map of dog IDs to their next appointment
  const dogAppointmentMap = {};
  upcomingAppointments.forEach(apt => {
    if (!dogAppointmentMap[apt.dog_id]) {
      dogAppointmentMap[apt.dog_id] = apt;
    }
  });

  const filteredDogs = dogs.filter(dog => {
    const matchesSearch = 
      dog.naam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dog.baasje_naam?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dog.ras?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dog.andere_gezondheidsproblemen?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dog.huid_en_vacht?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterTag === "all" || 
      (dog.status_tags && dog.status_tags.includes(filterTag));

    return matchesSearch && matchesFilter;
  });

  const defaultDogAvatar = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f3c7479ea85c36ceb42b10/27ff84f5c_Kwispelwandelt.jpg";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="kwiek-heading text-3xl md:text-4xl">Alle Honden</h1>
          <p className="text-gray-600 mt-1">Overzicht van alle hondenprofielen</p>
        </div>
        <Link to={createPageUrl("NieuweHond")}>
          <Button className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
                  style={{ backgroundColor: 'var(--primary-blue)' }}>
            <Plus className="w-5 h-5 mr-2" />
            Nieuwe Hond
          </Button>
        </Link>
      </div>

      {/* Search and Filter */}
      <Card className="border-2 rounded-2xl shadow-md" style={{ borderColor: 'var(--primary-pink)' }}>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Zoek op naam, ras, eigenaar of gezondheidsproblemen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 rounded-xl border-2"
                style={{ borderColor: 'var(--primary-pink)' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-48 h-12 rounded-xl border-2"
                              style={{ borderColor: 'var(--primary-pink)' }}>
                  <SelectValue placeholder="Filter op status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle honden</SelectItem>
                  <SelectItem value="overgewicht">Overgewicht</SelectItem>
                  <SelectItem value="ondergewicht">Ondergewicht</SelectItem>
                  <SelectItem value="allergieën">Allergieën</SelectItem>
                  <SelectItem value="huidproblemen">Huidproblemen</SelectItem>
                  <SelectItem value="spijsverteringsproblemen">Spijsvertering</SelectItem>
                  <SelectItem value="gedragsproblemen">Gedrag</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dogs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="border-2 rounded-2xl animate-pulse" 
                  style={{ borderColor: 'var(--primary-pink)' }}>
              <CardContent className="p-6">
                <div className="h-48 bg-gray-200 rounded-xl mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))
        ) : filteredDogs.length === 0 ? (
          <div className="col-span-full">
            <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
              <CardContent className="p-12 text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-50" 
                            style={{ color: 'var(--primary-blue)' }} />
                <p className="text-xl font-medium mb-2" style={{ color: 'var(--primary-blue)' }}>
                  Geen honden gevonden
                </p>
                <p className="text-gray-600">
                  {searchQuery || filterTag !== "all" ? 'Probeer een andere zoekterm of filter' : 'Voeg je eerste hond toe om te beginnen'}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <AnimatePresence>
            {filteredDogs.map((dog, index) => {
              const hasAppointment = !!dogAppointmentMap[dog.id];
              return (
                <motion.div
                  key={dog.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link to={createPageUrl("HondenDetail", `id=${dog.id}`)}>
                    <Card className="border-2 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden relative"
                          style={{ 
                            borderColor: 'var(--primary-pink)',
                            backgroundColor: 'var(--primary-pink)',
                            minHeight: '400px'
                          }}>
                      
                      {/* Appointment Indicator */}
                      <div className="absolute top-4 right-4 z-10">
                        {hasAppointment ? (
                          <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-md">
                            <CheckCircle className="w-4 h-4" />
                            <span>AFSPRAAK GEPLAND</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-md">
                            <AlertCircle className="w-4 h-4" />
                            <span>NOG GEEN AFSPRAAK</span>
                          </div>
                        )}
                      </div>

                      {/* Profile Photo - Top Left, Circular with Blue Border */}
                      <div className="p-6 pb-0 flex justify-start">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 shadow-xl"
                             style={{ borderColor: 'var(--primary-blue)', backgroundColor: 'white' }}>
                          <img 
                            src={dog.foto_url || defaultDogAvatar}
                            alt={dog.naam}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* White Content Section */}
                      <CardContent className="bg-white mx-4 mb-4 mt-2 p-5 rounded-xl shadow-sm">
                        {/* Name and Birth Year */}
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="kwiek-heading text-2xl leading-tight">{dog.naam}</h3>
                          <span className="text-2xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                            {dog.geboortejaar || '-'}
                          </span>
                        </div>

                        {/* Breed */}
                        <p className="text-gray-700 mb-1 font-medium">{dog.ras}</p>
                        
                        {/* Gender + Castrated */}
                        <p className="text-gray-600 text-sm mb-3">
                          {dog.geslacht === 'vrouwelijk' ? 'Vrouwelijk' : 'Mannelijk'}
                          {dog.gecastreerd && ' (gesteriliseerd)'}
                        </p>

                        {/* Owner */}
                        <p className="text-sm text-gray-600 mb-4">
                          Baasje: <span className="font-medium">{dog.baasje_naam}</span>
                        </p>

                        {/* Status Tags */}
                        {dog.status_tags && dog.status_tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {dog.status_tags.slice(0, 2).map((tag) => (
                              <Badge 
                                key={tag}
                                className="rounded-full text-xs px-3 py-1"
                                style={{ 
                                  backgroundColor: tag === 'allergieën' ? '#fce4ec' : '#e1d5f4',
                                  color: tag === 'allergieën' ? '#c62828' : '#6a1b9a',
                                  border: 'none'
                                }}
                              >
                                {tag}
                              </Badge>
                            ))}
                            {dog.status_tags.length > 2 && (
                              <Badge className="rounded-full text-xs px-3 py-1 bg-gray-100 text-gray-700">
                                +{dog.status_tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
