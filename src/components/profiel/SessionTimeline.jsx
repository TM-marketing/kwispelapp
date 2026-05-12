
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Edit, Activity, TrendingUp, TrendingDown, Minus, Weight } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function SessionTimeline({ sessions, dogId }) {
  if (!sessions || sessions.length === 0) {
    return (
      <Card className="border-2 rounded-2xl" style={{ borderColor: 'var(--primary-pink)' }}>
        <CardHeader>
          <CardTitle className="kwiek-heading">Sessiegeschiedenis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" 
                     style={{ color: 'var(--primary-blue)' }} />
            <p className="text-gray-600 mb-4">Nog geen sessies beschikbaar</p>
            <Link to={createPageUrl("NieuweSessie", `dogId=${dogId}`)}>
              <Button style={{ backgroundColor: 'var(--primary-blue)' }}>
                Eerste Sessie Toevoegen
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedSessions = [...sessions].sort((a, b) => 
    new Date(b.datum).getTime() - new Date(a.datum).getTime()
  );

  const locatieLabels = {
    winkel: 'Winkel',
    telefoon: 'Telefoon',
    video: 'Video',
    thuisbezoek: 'Thuisbezoek'
  };

  const typeLabels = {
    intake: 'Intake',
    opvolging: 'Opvolging',
    doel_activatie: 'Opvolging' 
  };

  // Helper: Bepaal gewichtstrend
  const getWeightTrend = (currentSession, previousSession) => {
    if (!currentSession?.gewicht_kg || !previousSession?.gewicht_kg) return null;
    const diff = currentSession.gewicht_kg - previousSession.gewicht_kg;
    if (Math.abs(diff) < 0.1) return { icon: Minus, text: 'Gelijk', color: 'text-gray-500', diff: 0 };
    if (diff > 0) return { icon: TrendingUp, text: 'Gestegen', color: 'text-orange-500', diff };
    return { icon: TrendingDown, text: 'Gedaald', color: 'text-green-500', diff };
  };

  // Helper: Truncate text
  const truncateText = (text, maxLength = 150) => {
    if (!text) return '';
    const cleanText = text.replace(/<[^>]*>/g, ''); // Strip HTML
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.substring(0, maxLength) + '...';
  };

  return (
    <Card className="border-2 rounded-2xl shadow-md" style={{ borderColor: 'var(--primary-pink)' }}>
      <CardHeader>
        <CardTitle className="kwiek-heading">Sessiegeschiedenis</CardTitle>
        <p className="text-sm text-gray-600 mt-1">{sortedSessions.length} sessie(s) geregistreerd</p>
      </CardHeader>
      <CardContent>
        {/* Tijdlijn Visualisatie */}
        <div className="relative">
          {/* Verticale lijn */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-pink-200 to-transparent"></div>

          <Accordion type="single" collapsible className="space-y-6">
            {sortedSessions.map((session, index) => {
              const weightTrend = index < sortedSessions.length - 1 ? getWeightTrend(session, sortedSessions[index + 1]) : null;
              const TrendIcon = weightTrend?.icon;
              
              return (
                <AccordionItem 
                  key={session.id} 
                  value={session.id}
                  className="border-none"
                >
                  <div className="relative pl-16">
                    {/* Bolletje op tijdlijn */}
                    <div 
                      className="absolute left-3 top-4 w-6 h-6 rounded-full border-4 shadow-md transition-all hover:scale-125"
                      style={{ 
                        backgroundColor: session.type === 'intake' ? 'var(--primary-blue)' : 'var(--primary-pink)',
                        borderColor: 'white'
                      }}
                    />

                    <AccordionTrigger className="hover:no-underline p-4 rounded-xl hover:bg-gray-50 transition-all border-2"
                                     style={{ borderColor: 'var(--primary-pink)' }}>
                      <div className="flex-1 text-left">
                        {/* Header Row */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Badge 
                              className="rounded-full text-xs px-3 py-1"
                              style={{ 
                                backgroundColor: session.type === 'intake' ? 'var(--primary-blue)' : 'var(--primary-pink)',
                                color: 'white',
                                border: 'none'
                              }}
                            >
                              {typeLabels[session.type] || 'Opvolging'}
                            </Badge>
                            
                            <span className="text-base font-semibold" style={{ color: 'var(--primary-blue)' }}>
                              {format(new Date(session.datum), 'd MMMM yyyy', { locale: nl })}
                            </span>

                            {weightTrend && TrendIcon && (
                              <div className="flex items-center gap-1">
                                <TrendIcon className={`w-4 h-4 ${weightTrend.color}`} />
                                <span className={`text-xs font-medium ${weightTrend.color}`}>
                                  {Math.abs(weightTrend.diff).toFixed(1)} kg
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Bewerken knop met correcte parameters */}
                          <Link to={createPageUrl("BewerkSessie") + `?id=${session.id}&dogId=${dogId}`}>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="hover:bg-blue-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Bewerken
                            </Button>
                          </Link>
                        </div>

                        {/* Preview Row */}
                        {session.nieuw_advies && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {truncateText(session.nieuw_advies)}
                          </p>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {session.gewicht_kg && (
                            <span className="flex items-center gap-1">
                              <Weight className="w-3 h-3" />
                              {session.gewicht_kg} kg
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {locatieLabels[session.locatie] || session.locatie}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4 pt-2">
                      <div className="space-y-4 bg-gray-50 rounded-xl p-4">
                        {/* Symptoomscores - FIX: Alleen tonen als ze > 0 zijn */}
                        {session.symptoom_scores && Object.entries(session.symptoom_scores).some(([_, value]) => value > 0) && (
                          <div>
                            <p className="text-sm font-semibold mb-3" style={{ color: 'var(--primary-blue)' }}>
                              Symptoomscores
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {Object.entries(session.symptoom_scores)
                                .filter(([_, value]) => value > 0) // FIX: Filter alleen scores > 0
                                .map(([key, value]) => (
                                <div key={key} className="bg-white rounded-lg p-3 shadow-sm">
                                  <p className="text-xs text-gray-600 capitalize mb-1">{key}</p>
                                  <p className="text-xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                                    {value}/10
                                  </p>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                    <div 
                                      className="h-1.5 rounded-full transition-all"
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

                        {/* Observaties */}
                        {(session.huid_en_vacht_opmerking || session.andere_gezondheidsproblemen_opmerking || session.algemene_notities) && (
                          <div>
                            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--primary-blue)' }}>
                              Observaties
                            </p>
                            <div className="space-y-2">
                              {session.huid_en_vacht_opmerking && (
                                <div className="bg-white rounded-lg p-3">
                                  <p className="text-xs font-medium text-gray-600 mb-1">Huid & Vacht</p>
                                  <div 
                                    className="text-sm text-gray-700"
                                    dangerouslySetInnerHTML={{ __html: session.huid_en_vacht_opmerking }}
                                  />
                                </div>
                              )}
                              {session.andere_gezondheidsproblemen_opmerking && (
                                <div className="bg-white rounded-lg p-3">
                                  <p className="text-xs font-medium text-gray-600 mb-1">Andere Gezondheidsproblemen</p>
                                  <div 
                                    className="text-sm text-gray-700"
                                    dangerouslySetInnerHTML={{ __html: session.andere_gezondheidsproblemen_opmerking }}
                                  />
                                </div>
                              )}
                              {session.algemene_notities && (
                                <div className="bg-white rounded-lg p-3">
                                  <p className="text-xs font-medium text-gray-600 mb-1">Algemene Notities</p>
                                  <div 
                                    className="text-sm text-gray-700"
                                    dangerouslySetInnerHTML={{ __html: session.algemene_notities }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Voedingsaanpassingen */}
                        {session.voeding_aanpassingen && (
                          <div>
                            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--primary-blue)' }}>
                              Voedingsaanpassingen
                            </p>
                            <div 
                              className="bg-white rounded-lg p-3 text-sm text-gray-700"
                              dangerouslySetInnerHTML={{ __html: session.voeding_aanpassingen }}
                            />
                          </div>
                        )}

                        {/* Supplementen */}
                        {session.supplementen && session.supplementen.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--primary-blue)' }}>
                              Supplementen
                            </p>
                            <div className="space-y-2">
                              {session.supplementen.map((supplement, idx) => (
                                <div key={idx} className="bg-white rounded-lg p-3 flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                       style={{ backgroundColor: 'var(--primary-pink)' }}>
                                    <span className="text-sm font-bold" style={{ color: 'var(--primary-blue)' }}>
                                      {idx + 1}
                                    </span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-sm" style={{ color: 'var(--primary-blue)' }}>
                                      {supplement.naam}
                                    </p>
                                    {supplement.dosering && (
                                      <p className="text-xs text-gray-600">Dosering: {supplement.dosering}</p>
                                    )}
                                    {supplement.doel && (
                                      <p className="text-xs text-gray-600">Doel: {supplement.doel}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Volledig Advies */}
                        {session.nieuw_advies && (
                          <div>
                            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--primary-blue)' }}>
                              Volledig Voedingsadvies
                            </p>
                            <div 
                              className="bg-white rounded-lg p-4 text-sm prose prose-sm max-w-none"
                              style={{
                                '--tw-prose-headings': 'var(--primary-blue)',
                                '--tw-prose-links': 'var(--primary-blue)',
                                '--tw-prose-bold': 'var(--primary-blue)',
                              }}
                              dangerouslySetInnerHTML={{ __html: session.nieuw_advies }}
                            />
                          </div>
                        )}

                        {/* Expert Naam */}
                        {session.expert_naam && (
                          <div className="text-xs text-gray-500 pt-2 border-t">
                            Expert: {session.expert_naam}
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </div>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
