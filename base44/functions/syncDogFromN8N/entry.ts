import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * syncDogFromN8N - Webhook Endpoint voor N8N Integratie
 * 
 * Deze functie ontvangt hondgegevens van een n8n workflow en maakt een nieuw 
 * profiel aan of werkt een bestaand profiel bij (upsert logica).
 * 
 * Bij het aanmaken van een NIEUWE hond worden ook automatisch aangemaakt:
 * - WeightMeasurement (als start_weight_kg aanwezig is)
 * - Intake Session
 * 
 * Unieke identificatie: naam + baasje_email
 * 
 * Beveiliging: Vereist N8N_WEBHOOK_SECRET in header 'x-n8n-secret'
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // --- STAP 1: Beveiliging - Verifieer gedeeld geheim ---
    const n8nSecret = req.headers.get('x-n8n-secret');
    const expectedSecret = Deno.env.get('N8N_WEBHOOK_SECRET');

    if (!expectedSecret) {
      console.error('N8N_WEBHOOK_SECRET is niet ingesteld in Base44 Secrets!');
      return Response.json({ 
        error: 'Server configuration error', 
        details: 'N8N_WEBHOOK_SECRET not configured' 
      }, { status: 500 });
    }

    if (!n8nSecret || n8nSecret !== expectedSecret) {
      console.error('Unauthorized access attempt - Invalid or missing secret');
      return Response.json({ 
        error: 'Unauthorized', 
        details: 'Invalid or missing x-n8n-secret header' 
      }, { status: 401 });
    }

    // --- STAP 2: Parse de inkomende data ---
    if (req.method !== 'POST') {
      return Response.json({ 
        error: 'Method not allowed', 
        details: 'Only POST requests are accepted' 
      }, { status: 405 });
    }

    const payload = await req.json();
    console.log('Received payload from n8n:', JSON.stringify(payload, null, 2));

    // --- STAP 3: Valideer verplichte velden ---
    if (!payload.naam || !payload.baasje_email) {
      return Response.json({ 
        error: 'Invalid data', 
        details: 'naam and baasje_email are required fields',
        received: { naam: payload.naam, baasje_email: payload.baasje_email }
      }, { status: 400 });
    }

    // Valideer email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.baasje_email)) {
      return Response.json({ 
        error: 'Invalid data', 
        details: 'baasje_email must be a valid email address',
        received: { baasje_email: payload.baasje_email }
      }, { status: 400 });
    }

    // --- STAP 4: Bereid Dog data voor ---
    const dogData = {
      naam: payload.naam,
      ras: payload.ras || null,
      geboortejaar: payload.geboortejaar ? parseInt(payload.geboortejaar) : null,
      geslacht: payload.geslacht || 'mannelijk',
      gecastreerd: payload.gecastreerd === true || payload.gecastreerd === 'true',
      foto_url: payload.foto_url || null,
      start_weight_kg: payload.start_weight_kg ? parseFloat(payload.start_weight_kg) : null,
      huidige_voeding: payload.huidige_voeding || null,
      hoeveelheid_voeding: payload.hoeveelheid_voeding || null,
      bijvoeding: payload.bijvoeding || null,
      aantal_voedingen: payload.aantal_voedingen ? parseInt(payload.aantal_voedingen) : 2,
      eetgedrag: payload.eetgedrag || 'rustig',
      allergieën: payload.allergieën || null,
      medicatie: payload.medicatie || null,
      supplementen: payload.supplementen || null,
      andere_gezondheidsproblemen: payload.andere_gezondheidsproblemen || null,
      huid_en_vacht: payload.huid_en_vacht || null,
      dagelijkse_activiteit: payload.dagelijkse_activiteit || null,
      ongewenst_gedrag: payload.ongewenst_gedrag || null,
      gras_eten: payload.gras_eten || 'zelden_of_nooit',
      ontlasting_samenvatting: payload.ontlasting_samenvatting || null,
      karakter: payload.karakter || null,
      aanvullingen: payload.aanvullingen || null,
      eerste_advies: payload.eerste_advies || null,
      status_tags: Array.isArray(payload.status_tags) ? payload.status_tags : [],
      baasje_naam: payload.baasje_naam || null,
      baasje_email: payload.baasje_email,
      baasje_telefoon: payload.baasje_telefoon || null,
      baasje_postcode: payload.baasje_postcode || null,
      baasje_plaats: payload.baasje_plaats || null,
      gastpas_wachtwoord: payload.gastpas_wachtwoord || null,
      gastpas_slug: payload.gastpas_slug || null,
    };

    // Verwijder null/undefined velden om onnodige updates te voorkomen
    Object.keys(dogData).forEach(key => {
      if (dogData[key] === null || dogData[key] === undefined) {
        delete dogData[key];
      }
    });

    console.log('Prepared dog data:', JSON.stringify(dogData, null, 2));

    // --- STAP 5: Zoek naar bestaande hond (Unieke identificatie: naam + baasje_email) ---
    const existingDogs = await base44.asServiceRole.entities.Dog.filter({
      naam: payload.naam,
      baasje_email: payload.baasje_email
    });

    console.log(`Found ${existingDogs.length} existing dog(s) with naam="${payload.naam}" and baasje_email="${payload.baasje_email}"`);

    if (existingDogs.length > 0) {
      // --- STAP 6A: Hond bestaat - UPDATE ---
      const existingDog = existingDogs[0];
      
      // Verwijder start_weight_kg uit update data (mag niet gewijzigd worden na aanmaak)
      delete dogData.start_weight_kg;
      
      await base44.asServiceRole.entities.Dog.update(existingDog.id, dogData);
      
      console.log(`✅ Dog UPDATED successfully: ${payload.naam} (ID: ${existingDog.id})`);
      
      return Response.json({
        success: true,
        action: 'updated',
        dog: {
          id: existingDog.id,
          naam: payload.naam,
          baasje_email: payload.baasje_email
        },
        message: `Dog profiel "${payload.naam}" succesvol bijgewerkt`
      }, { status: 200 });

    } else {
      // --- STAP 6B: Hond bestaat niet - CREATE + Intake Sessie + Gewichtsmeting ---
      console.log(`Creating new dog: ${payload.naam}`);
      const newDog = await base44.asServiceRole.entities.Dog.create(dogData);
      console.log(`✅ Dog CREATED successfully: ${payload.naam} (ID: ${newDog.id})`);
      
      const now = new Date().toISOString();
      const warnings = []; // Verzamel eventuele waarschuwingen
      
      // --- STAP 6B.1: Maak WeightMeasurement aan (indien start_weight_kg aanwezig) ---
      if (dogData.start_weight_kg) {
        try {
          await base44.asServiceRole.entities.WeightMeasurement.create({
            dog_id: newDog.id,
            datum: now.split('T')[0], // Alleen datum (YYYY-MM-DD)
            gewicht_kg: dogData.start_weight_kg,
            bron: "intake",
            verified_by_expert: true,
            opmerking: "Startgewicht bij intake via n8n"
          });
          console.log(`✅ Initial weight measurement created: ${dogData.start_weight_kg}kg`);
        } catch (weightError) {
          console.error('⚠️ Failed to create initial weight measurement:', weightError);
          warnings.push(`Weight measurement kon niet worden aangemaakt: ${weightError.message}`);
          // We gaan DOOR - de hond is aangemaakt, alleen de gewichtsmeting is mislukt
        }
      } else {
        console.log('ℹ️ No start_weight_kg provided, skipping weight measurement');
      }
      
      // --- STAP 6B.2: Maak Intake Session aan ---
      try {
        const sessionData = {
          dog_id: newDog.id,
          type: "intake",
          datum: now, // Volledige ISO timestamp
          locatie: payload.locatie || "winkel", // Default naar "winkel" als niet meegegeven
          symptoom_scores: {
            jeuk: payload.symptoom_scores?.jeuk || 0,
            roodheid: payload.symptoom_scores?.roodheid || 0,
            schilfers: payload.symptoom_scores?.schilfers || 0,
            stoelgang: payload.symptoom_scores?.stoelgang || 0,
            gedrag: payload.symptoom_scores?.gedrag || 0,
            energie: payload.symptoom_scores?.energie || 0
          },
          voeding_huidige: dogData.huidige_voeding || "",
          nieuw_advies: dogData.eerste_advies || "",
          status: "final", // Intake sessie is meteen final
          expert_naam: payload.expert_naam || "n8n Integration"
        };
        
        // Voeg optioneel gewicht toe aan sessie (voor referentie)
        if (dogData.start_weight_kg) {
          sessionData.gewicht_notitie = `Startgewicht: ${dogData.start_weight_kg}kg`;
        }
        
        const intakeSession = await base44.asServiceRole.entities.Session.create(sessionData);
        console.log(`✅ Intake session created successfully (ID: ${intakeSession.id})`);
      } catch (sessionError) {
        console.error('⚠️ Failed to create intake session:', sessionError);
        warnings.push(`Intake sessie kon niet worden aangemaakt: ${sessionError.message}`);
        // We gaan DOOR - de hond is aangemaakt, alleen de sessie is mislukt
      }
      
      // --- STAP 7: Return success response ---
      const response = {
        success: true,
        action: 'created',
        dog: {
          id: newDog.id,
          naam: payload.naam,
          baasje_email: payload.baasje_email
        },
        message: `Nieuw dog profiel "${payload.naam}" succesvol aangemaakt`
      };
      
      if (warnings.length > 0) {
        response.warnings = warnings;
        response.message += ` (met waarschuwingen)`;
      }
      
      return Response.json(response, { status: 201 });
    }

  } catch (error) {
    console.error('❌ Error in syncDogFromN8N:', error);
    
    return Response.json({ 
      error: 'Internal server error',
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});