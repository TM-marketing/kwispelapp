import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * DogSnapshot Endpoint
 * Centrale leeslaag voor alle hond-gerelateerde data
 * UPDATED: Works both for authenticated experts AND unauthenticated guests
 */

Deno.serve(async (req) => {
  try {
    console.log('=== getDogSnapshot START ===');
    
    // Try to create client from request
    const base44 = createClientFromRequest(req);
    
    // Check authentication - but don't fail if not authenticated (for guests)
    let user = null;
    let isGuest = false;
    
    try {
      user = await base44.auth.me();
      console.log('✓ Authenticated user:', user?.email);
    } catch (authError) {
      console.log('ℹ️  No authenticated user (guest access)');
      isGuest = true;
    }

    // Probeer dogId uit meerdere bronnen te halen
    let dogId = null;
    let includePrivate = !isGuest; // Guests don't get private info by default

    // 1. Probeer URL parameters
    const url = new URL(req.url);
    dogId = url.searchParams.get('dogId');
    const includePrivateParam = url.searchParams.get('includePrivate');
    if (includePrivateParam !== null) {
      includePrivate = includePrivateParam !== 'false' && !isGuest;
    }

    // 2. Als niet in URL, probeer request body
    if (!dogId && req.method === 'POST') {
      try {
        const body = await req.json();
        dogId = body.dogId;
        if (body.includePrivate !== undefined) {
          includePrivate = body.includePrivate !== false && !isGuest;
        }
      } catch (e) {
        console.error('getDogSnapshot: Failed to parse request body:', e);
      }
    }

    console.log('getDogSnapshot called with:', { dogId, includePrivate, isGuest });

    if (!dogId) {
      console.error('getDogSnapshot: Missing dogId parameter');
      return Response.json({ 
        error: 'dogId parameter is required',
        receivedParams: { url: req.url, method: req.method }
      }, { status: 400 });
    }

    // Haal alle data op via service role voor complete snapshot
    console.log('getDogSnapshot: Fetching data for dog:', dogId);
    
    const [dogs, allSessions, allWeights, allGoals, allAppointments] = await Promise.all([
      base44.asServiceRole.entities.Dog.list(),
      base44.asServiceRole.entities.Session.list('-datum'),
      base44.asServiceRole.entities.WeightMeasurement.list('-datum'),
      base44.asServiceRole.entities.Goal.list('-created_date'),
      base44.asServiceRole.entities.Appointment.list('datum_tijd')
    ]);

    const dog = dogs.find(d => d.id === dogId);

    if (!dog) {
      console.error('getDogSnapshot: Dog not found with id:', dogId);
      return Response.json({ error: 'Dog not found' }, { status: 404 });
    }

    console.log('getDogSnapshot: Found dog:', dog.naam);

    // Filter data voor deze specifieke hond
    const dogSessions = allSessions.filter(s => s.dog_id === dogId);
    const dogWeights = allWeights.filter(w => w.dog_id === dogId);
    const dogGoals = allGoals.filter(g => g.dog_id === dogId);
    const dogAppointments = allAppointments.filter(a => a.dog_id === dogId);

    console.log('getDogSnapshot: Found', dogSessions.length, 'sessions,', dogWeights.length, 'weights,', dogGoals.length, 'goals');

    // Filter sessies: alleen "final" status
    const finalSessions = dogSessions.filter(s => s.status === 'final');
    const latestSession = finalSessions[0] || null;

    // Filter gewichten: alleen verified voor sommige berekeningen
    const verifiedWeights = dogWeights.filter(w => w.verified_by_expert);
    const latestVerifiedWeight = verifiedWeights[0] || null;
    const latestAnyWeight = dogWeights[0] || null;

    // Bereken trends (laatste 6 metingen)
    const recentWeights = dogWeights.slice(0, 6);
    const weightTrend = calculateTrend(recentWeights.map(w => w.gewicht_kg));

    // Bereken symptoom trends (laatste 6 sessies)
    const recentSessions = finalSessions.slice(0, 6);
    const symptoomTrends = {};
    const symptoomKeys = ['jeuk', 'roodheid', 'schilfers', 'stoelgang', 'gedrag', 'energie'];
    
    symptoomKeys.forEach(key => {
      const values = recentSessions
        .filter(s => s.symptoom_scores && s.symptoom_scores[key] !== undefined)
        .map(s => s.symptoom_scores[key]);
      symptoomTrends[key] = {
        current: latestSession?.symptoom_scores?.[key] || 0,
        trend: calculateTrend(values),
        history: values.slice(0, 6)
      };
    });

    // Zoek volgende afspraak
    const now = new Date();
    const nextAppointment = dogAppointments.find(a => 
      new Date(a.datum_tijd) > now && a.status === 'gepland'
    );

    // Construct the current_state object
    const current_state_data = {
      weight: {
        latest_verified: latestVerifiedWeight ? {
          value: latestVerifiedWeight.gewicht_kg,
          date: latestVerifiedWeight.datum,
          source: latestVerifiedWeight.bron
        } : null,
        latest_any: latestAnyWeight ? {
          value: latestAnyWeight.gewicht_kg,
          date: latestAnyWeight.datum,
          source: latestAnyWeight.bron,
          verified: latestAnyWeight.verified_by_expert
        } : null,
        trend: weightTrend
      },
      symptomen: symptoomTrends,
      laatste_sessie: latestSession ? {
        id: latestSession.id,
        datum: latestSession.datum,
        type: latestSession.type,
        locatie: latestSession.locatie,
        expert_naam: includePrivate ? latestSession.expert_naam : undefined,
        symptoom_scores: latestSession.symptoom_scores,
        nieuw_advies: latestSession.nieuw_advies,
        gewicht_kg: latestSession.gewicht_kg,
        huid_en_vacht_opmerking: latestSession.huid_en_vacht_opmerking,
        andere_gezondheidsproblemen_opmerking: latestSession.andere_gezondheidsproblemen_opmerking,
        algemene_notities: latestSession.algemene_notities,
        voeding_aanpassingen: latestSession.voeding_aanpassingen
      } : null,
      huidig_advies: latestSession?.nieuw_advies || dog.eerste_advies || null
    };

    // Bereken actieve doelen (gededupliceerd)
    const activeGoals = deduplicateGoals(dogGoals.filter(g => g.status === 'actief'));
    
    console.log('getDogSnapshot: Active goals after dedup:', activeGoals.length);
    
    // Bereken of doelen behaald zijn
    activeGoals.forEach(goal => {
      const statusResult = calculateGoalStatus(goal, current_state_data);
      goal.progress_percentage = statusResult.progress;
      goal.is_achieved = statusResult.isAchieved;
      goal.current_value = statusResult.currentValue;
      goal.trend = statusResult.trend;
      goal.computed_status = statusResult.isAchieved ? 'bereikt' : 'actief';
    });

    // Bouw de snapshot
    const snapshot = {
      dog: {
        id: dog.id,
        naam: dog.naam,
        ras: dog.ras,
        geboortejaar: dog.geboortejaar,
        geslacht: dog.geslacht,
        gecastreerd: dog.gecastreerd,
        foto_url: dog.foto_url,
        start_weight_kg: dog.start_weight_kg,
        status_tags: dog.status_tags || [],
        baasje_naam: dog.baasje_naam,
        baasje_email: includePrivate ? dog.baasje_email : undefined,
        baasje_telefoon: dog.baasje_telefoon,
        baasje_postcode: dog.baasje_postcode,
        baasje_plaats: dog.baasje_plaats,
        huidige_voeding: dog.huidige_voeding,
        hoeveelheid_voeding: dog.hoeveelheid_voeding,
        bijvoeding: dog.bijvoeding,
        aantal_voedingen: dog.aantal_voedingen,
        eetgedrag: dog.eetgedrag,
        allergieën: dog.allergieën,
        medicatie: dog.medicatie,
        supplementen: dog.supplementen,
        huid_en_vacht: dog.huid_en_vacht,
        andere_gezondheidsproblemen: dog.andere_gezondheidsproblemen,
        dagelijkse_activiteit: dog.dagelijkse_activiteit,
        karakter: dog.karakter,
        ongewenst_gedrag: dog.ongewenst_gedrag,
        gras_eten: dog.gras_eten,
        ontlasting_samenvatting: dog.ontlasting_samenvatting,
        aanvullingen: dog.aanvullingen,
        eerste_advies: dog.eerste_advies,
        visualisaties: dog.visualisaties
      },
      current_state: current_state_data,
      goals: activeGoals,
      statistics: {
        totaal_sessies: finalSessions.length,
        totaal_gewichtsmetingen: dogWeights.length,
        actieve_doelen: activeGoals.length,
        afgeronde_doelen: dogGoals.filter(g => g.status === 'afgerond').length
      },
      next_appointment: nextAppointment ? {
        id: nextAppointment.id,
        datum_tijd: nextAppointment.datum_tijd,
        locatie: nextAppointment.locatie,
        duur_minuten: nextAppointment.duur_minuten
      } : null,
      trends: {
        weight_last_6: recentWeights.map(w => ({
          datum: w.datum,
          gewicht_kg: w.gewicht_kg,
          bron: w.bron,
          verified: w.verified_by_expert
        })),
        sessions_last_6: recentSessions.map(s => ({
          id: s.id,
          datum: s.datum,
          symptoom_scores: s.symptoom_scores,
          type: s.type,
          gewicht_kg: s.gewicht_kg,
          nieuw_advies: s.nieuw_advies,
          locatie: s.locatie,
          huid_en_vacht_opmerking: s.huid_en_vacht_opmerking,
          andere_gezondheidsproblemen_opmerking: s.andere_gezondheidsproblemen_opmerking,
          algemene_notities: s.algemene_notities,
          voeding_aanpassingen: s.voeding_aanpassingen,
          supplementen: s.supplementen,
          expert_naam: includePrivate ? s.expert_naam : undefined
        }))
      }
    };

    console.log('getDogSnapshot: Successfully created snapshot for', dog.naam);

    return Response.json(snapshot, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('getDogSnapshot error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});

/**
 * Dedupliceer doelen
 */
function deduplicateGoals(goals) {
  const goalMap = new Map();
  
  const sortedGoals = [...goals].sort((a, b) => 
    new Date(b.created_date) - new Date(a.created_date)
  );
  
  for (const goal of sortedGoals) {
    let key;
    
    if (goal.type === 'gewicht') {
      key = 'gewicht';
    } else if (goal.type === 'symptoom' && goal.symptom_key) {
      key = `symptoom_${goal.symptom_key}`;
    } else {
      key = `unknown_${goal.id}`;
    }
    
    if (!goalMap.has(key)) {
      goalMap.set(key, goal);
    }
  }
  
  return Array.from(goalMap.values());
}

/**
 * Bereken trend
 */
function calculateTrend(values) {
  if (!values || values.length < 2) return 'onbekend';
  
  const recent = values.slice(0, Math.min(3, values.length));
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const oldest = values[values.length - 1];
  
  const diff = avg - oldest;
  const threshold = oldest * 0.05;
  
  if (Math.abs(diff) < threshold) return 'stabiel';
  return diff > 0 ? 'stijgend' : 'dalend';
}

/**
 * Bereken doel status
 */
function calculateGoalStatus(goal, currentState) {
  if (goal.type === 'gewicht') {
    const latestWeight = currentState.weight?.latest_any;
    if (!latestWeight) {
      return {
        currentValue: goal.start_waarde,
        progress: 0,
        isAchieved: false,
        trend: 'stable'
      };
    }

    const currentValue = latestWeight.value;
    const range = Math.abs(goal.streef_waarde - goal.start_waarde);
    const change = Math.abs(currentValue - goal.start_waarde);
    const progress = range > 0 ? Math.min(100, (change / range) * 100) : 0;

    const margin = goal.streef_waarde * 0.03;
    const isAchieved = Math.abs(currentValue - goal.streef_waarde) <= margin;

    let trend = 'stable';
    const weightsTrend = currentState.weight?.trend;
    if (weightsTrend) {
      trend = weightsTrend;
    }

    return { currentValue, progress, isAchieved, trend };
  }

  if (goal.type === 'symptoom' && goal.symptom_key) {
    const symptomData = currentState.symptomen?.[goal.symptom_key];
    if (!symptomData) {
      return {
        currentValue: goal.start_waarde,
        progress: 0,
        isAchieved: false,
        trend: 'stable'
      };
    }

    const currentValue = symptomData.current;
    const range = Math.abs(goal.start_waarde - goal.streef_waarde);
    const change = Math.abs(goal.start_waarde - currentValue);
    const progress = range > 0 ? Math.min(100, (change / range) * 100) : 0;

    const isAchieved = currentValue <= goal.streef_waarde;

    let trend = 'stable';
    if (symptomData.trend) {
      trend = symptomData.trend;
    }

    return { currentValue, progress, isAchieved, trend };
  }

  return {
    currentValue: goal.start_waarde,
    progress: 0,
    isAchieved: false,
    trend: 'stable'
  };
}