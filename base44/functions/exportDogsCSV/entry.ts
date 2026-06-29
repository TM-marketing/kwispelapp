import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Helper: escape a value for CSV (RFC 4180)
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  let str = typeof value === 'string' ? value : String(value);
  // Strip HTML tags from rich-text fields for cleaner export
  str = str.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // Collapse whitespace and newlines
  str = str.replace(/\s+/g, ' ').trim();
  if (/[",\n\r]/.test(str)) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch all dogs (paginate to be safe)
    let allDogs = [];
    let batch;
    let skip = 0;
    const pageSize = 500;
    do {
      batch = await base44.asServiceRole.entities.Dog.list('-created_date', pageSize, skip);
      allDogs = allDogs.concat(batch);
      skip += pageSize;
    } while (batch.length === pageSize);

    const columns = [
      'id', 'naam', 'ras', 'geboortejaar', 'geslacht', 'gecastreerd',
      'start_weight_kg', 'huidige_voeding', 'hoeveelheid_voeding', 'bijvoeding',
      'aantal_voedingen', 'eetgedrag', 'allergieen', 'medicatie', 'supplementen',
      'andere_gezondheidsproblemen', 'huid_en_vacht', 'dagelijkse_activiteit',
      'ongewenst_gedrag', 'gras_eten', 'ontlasting_samenvatting', 'karakter',
      'aanvullingen', 'eerste_advies', 'status_tags',
      'baasje_naam', 'baasje_email', 'baasje_telefoon', 'baasje_postcode', 'baasje_plaats',
      'gastpas_slug', 'created_date', 'updated_date'
    ];

    const header = columns.join(',');
    const rows = allDogs.map((dog) => {
      return columns.map((col) => {
        let val = dog[col];
        if (col === 'status_tags' && Array.isArray(val)) val = val.join('; ');
        if (col === 'gecastreerd') val = val ? 'ja' : 'nee';
        return csvEscape(val);
      }).join(',');
    });

    const csv = '\uFEFF' + header + '\n' + rows.join('\n'); // BOM for Excel UTF-8

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename=honden-export.csv'
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});