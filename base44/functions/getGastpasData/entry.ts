import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * PUBLIC Gastpas Data Endpoint
 * Returns dog data for authenticated gastpas session
 * NO user authentication required - validates via dogId only
 */

Deno.serve(async (req) => {
  try {
    console.log('=== getGastpasData START ===');
    
    const base44 = createClientFromRequest(req);
    
    // Parse request
    const { dogId } = await req.json();
    console.log('Fetching data for dogId:', dogId);
    
    if (!dogId) {
      return Response.json({ 
        error: 'Missing dogId' 
      }, { status: 400 });
    }

    // Fetch all data via service role (no auth needed)
    const [allDogs, allSessions, allWeights, allGoals] = await Promise.all([
      base44.asServiceRole.entities.Dog.list(),
      base44.asServiceRole.entities.Session.list('-datum'),
      base44.asServiceRole.entities.WeightMeasurement.list('-datum'),
      base44.asServiceRole.entities.Goal.list('-created_date')
    ]);

    const dog = allDogs.find(d => d.id === dogId);
    if (!dog) {
      return Response.json({ error: 'Hond niet gevonden' }, { status: 404 });
    }

    console.log('✓ Found dog:', dog.naam);

    // Filter data voor deze hond
    const dogSessions = allSessions.filter(s => s.dog_id === dogId && s.status === 'final');
    const dogWeights = allWeights.filter(w => w.dog_id === dogId);
    const dogGoals = allGoals.filter(g => g.dog_id === dogId && g.status === 'actief');

    console.log('✓ Sessions:', dogSessions.length, 'Weights:', dogWeights.length, 'Goals:', dogGoals.length);

    const latestSession = dogSessions[0];
    const latestWeight = dogWeights[0];

    // Build snapshot
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
      },
      current_state: {
        weight: {
          latest_any: latestWeight ? {
            value: latestWeight.gewicht_kg,
            date: latestWeight.datum,
            source: latestWeight.bron
          } : null
        },
        laatste_sessie: latestSession ? {
          datum: latestSession.datum,
          nieuw_advies: latestSession.nieuw_advies
        } : null,
        huidig_advies: latestSession?.nieuw_advies || dog.eerste_advies || null
      },
      goals: dogGoals,
      statistics: {
        totaal_sessies: dogSessions.length,
        totaal_gewichtsmetingen: dogWeights.length,
        actieve_doelen: dogGoals.length
      },
      trends: {
        weight_last_6: dogWeights.slice(0, 6).map(w => ({
          datum: w.datum,
          gewicht_kg: w.gewicht_kg,
          bron: w.bron,
          verified: w.verified_by_expert
        })),
        sessions_last_6: dogSessions.slice(0, 6).map(s => ({
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
          supplementen: s.supplementen
        }))
      }
    };

    console.log('✓ Snapshot created successfully');

    return Response.json(snapshot, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('getGastpasData error:', error);
    return Response.json({ 
      error: 'Server error',
      details: error.message
    }, { status: 500 });
  }
});