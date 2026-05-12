import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

/**
 * Backfill Script voor WeightMeasurement Migratie
 * 
 * Migreert alle gewichtsdata van Session naar WeightMeasurement entiteit
 * Vult ook Dog.start_weight_kg in als deze leeg is
 * 
 * BELANGRIJK: Dit script moet eenmalig uitgevoerd worden
 * Voer eerst uit op test-data voordat je het op productie gebruikt
 * 
 * Query params:
 * - dryRun (optional): Boolean, als true worden geen wijzigingen doorgevoerd (default: true)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dryRun') !== 'false';

    console.log(`Starting backfill... (DRY RUN: ${dryRun})`);

    const [dogs, sessions, existingWeights] = await Promise.all([
      base44.asServiceRole.entities.Dog.list(),
      base44.asServiceRole.entities.Session.list('-datum'),
      base44.asServiceRole.entities.WeightMeasurement.list()
    ]);

    const results = {
      dogs_processed: 0,
      weights_created: 0,
      start_weights_set: 0,
      skipped_duplicates: 0,
      errors: [],
      dry_run: dryRun
    };

    for (const dog of dogs) {
      try {
        const dogSessions = sessions
          .filter(s => s.dog_id === dog.id && s.gewicht_kg)
          .sort((a, b) => new Date(a.datum) - new Date(b.datum));

        if (dogSessions.length === 0) {
          console.log(`No sessions with weight for dog ${dog.naam}, skipping`);
          continue;
        }

        results.dogs_processed++;

        for (const session of dogSessions) {
          const existingWeight = existingWeights.find(w => 
            w.session_id === session.id && w.dog_id === dog.id
          );

          if (existingWeight) {
            console.log(`Weight measurement already exists for session ${session.id}, skipping`);
            results.skipped_duplicates++;
            continue;
          }

          let bron = 'expert';
          if (session.type === 'intake') {
            bron = 'intake';
          }

          const weightData = {
            dog_id: dog.id,
            session_id: session.id,
            datum: session.datum.split('T')[0],
            gewicht_kg: session.gewicht_kg,
            bron: bron,
            verified_by_expert: true,
            opmerking: session.gewicht_notitie || ''
          };

          if (!dryRun) {
            await base44.asServiceRole.entities.WeightMeasurement.create(weightData);
          }
          
          results.weights_created++;
          console.log(`Created weight measurement for dog ${dog.naam} on ${weightData.datum}: ${weightData.gewicht_kg}kg`);
        }

        if (!dog.start_weight_kg && dogSessions.length > 0) {
          const firstWeight = dogSessions[0].gewicht_kg;
          
          if (!dryRun) {
            await base44.asServiceRole.entities.Dog.update(dog.id, {
              start_weight_kg: firstWeight
            });
          }
          
          results.start_weights_set++;
          console.log(`Set start weight for dog ${dog.naam}: ${firstWeight}kg`);
        }

      } catch (error) {
        console.error(`Error processing dog ${dog.id}:`, error);
        results.errors.push({
          dog_id: dog.id,
          dog_naam: dog.naam,
          error: error.message
        });
      }
    }

    console.log('Backfill completed!', results);

    return Response.json({
      success: true,
      message: dryRun ? 'Dry run completed - no changes made' : 'Backfill completed successfully',
      results,
      next_steps: dryRun ? [
        'Review the results above',
        'If everything looks correct, run again with ?dryRun=false'
      ] : [
        'Backfill complete',
        'You can now safely remove Session.gewicht_kg and Session.gewicht_notitie from the schema',
        'Update all UI components to use WeightMeasurement instead'
      ]
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return Response.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
});