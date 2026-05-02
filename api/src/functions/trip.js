const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');

const TABLE = 'japantrip';
const PARTITION = 'trip';

function getClient() {
  const conn = process.env.TABLES_CONNECTION_STRING;
  if (!conn) throw new Error('No TABLES_CONNECTION_STRING');
  return TableClient.fromConnectionString(conn, TABLE);
}

function cors(resp) {
  resp.headers = Object.assign({}, resp.headers, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  return resp;
}

function json(data, status = 200) {
  return cors({ status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}

async function ensureTable(client) {
  try { await client.createTable(); } catch(e) { if (e.statusCode !== 409) throw e; }
}

// GET /api/trip — returns full trip data
app.http('getTrip', {
  route: 'trip',
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return cors({ status: 204 });
    try {
      const client = getClient();
      await ensureTable(client);
      let trip = null;
      const days = [];
      for await (const entity of client.listEntities({ queryOptions: { filter: `PartitionKey eq '${PARTITION}'` } })) {
        const data = JSON.parse(entity.data || '{}');
        if (entity.rowKey === '__trip__') trip = data;
        else if (entity.rowKey.startsWith('day-')) days.push(data);
      }
      days.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.dayNumber || 0) - (b.dayNumber || 0));
      return json({ trip, days });
    } catch(e) {
      return json({ trip: null, days: [] });
    }
  }
});

// PUT /api/trip — save trip metadata
app.http('putTrip', {
  route: 'trip',
  methods: ['PUT'],
  authLevel: 'anonymous',
  handler: async (req) => {
    const body = JSON.parse(await req.text());
    const client = getClient();
    await ensureTable(client);
    await client.upsertEntity({
      partitionKey: PARTITION,
      rowKey: '__trip__',
      data: JSON.stringify(body.trip || {})
    }, 'Replace');
    return json({ ok: true });
  }
});

// GET /api/day/:id
app.http('getDay', {
  route: 'day/{id}',
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return cors({ status: 204 });
    const id = req.params.id;
    try {
      const client = getClient();
      const entity = await client.getEntity(PARTITION, id);
      return json(JSON.parse(entity.data || '{}'));
    } catch(e) {
      return json({ error: 'not found' }, 404);
    }
  }
});

// PUT /api/day/:id
app.http('putDay', {
  route: 'day/{id}',
  methods: ['PUT'],
  authLevel: 'anonymous',
  handler: async (req) => {
    const id = req.params.id;
    const body = JSON.parse(await req.text());
    body.id = id;
    const client = getClient();
    await ensureTable(client);
    await client.upsertEntity({
      partitionKey: PARTITION,
      rowKey: id,
      data: JSON.stringify(body)
    }, 'Replace');
    return json({ ok: true });
  }
});

// DELETE /api/day/:id
app.http('deleteDay', {
  route: 'day/{id}',
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: async (req) => {
    const id = req.params.id;
    try {
      const client = getClient();
      await client.deleteEntity(PARTITION, id);
    } catch(e) {}
    return json({ ok: true });
  }
});

// GET /api/saved
app.http('getSaved', {
  route: 'saved',
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: async (req) => {
    if (req.method === 'OPTIONS') return cors({ status: 204 });
    try {
      const client = getClient();
      const entity = await client.getEntity(PARTITION, '__saved__');
      return json(JSON.parse(entity.data || '{}'));
    } catch(e) {
      return json({ places: [] });
    }
  }
});

// PUT /api/saved
app.http('putSaved', {
  route: 'saved',
  methods: ['PUT'],
  authLevel: 'anonymous',
  handler: async (req) => {
    const body = JSON.parse(await req.text());
    const client = getClient();
    await ensureTable(client);
    await client.upsertEntity({
      partitionKey: PARTITION,
      rowKey: '__saved__',
      data: JSON.stringify(body)
    }, 'Replace');
    return json({ ok: true });
  }
});
