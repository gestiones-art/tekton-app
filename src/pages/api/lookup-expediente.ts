import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwxwxqhmzsqreptccczt.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY as string;

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca acentos
    .toUpperCase()
    .trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clave = req.query.key || req.headers['x-api-key'];
  if (clave !== process.env.MAKE_SECRET_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const expedienteRaw = (req.query.expediente as string) || '';
  const texto = (req.query.texto as string) || '';
  const expedienteNumero = expedienteRaw.match(/\d+/)?.[0];

  let tramite: any = null;

  if (expedienteNumero) {
    const { data } = await supabase
      .from('tramites')
      .select('nombre, municipio, numero_p, n_expediente, domicilio')
      .ilike('n_expediente', `%${expedienteNumero}%`)
      .limit(1);
    if (data && data.length > 0) tramite = data[0];
  }

  if (!tramite && texto) {
    const { data: candidatos } = await supabase
      .from('tramites')
      .select('nombre, municipio, numero_p, n_expediente, domicilio')
      .eq('finalizado', false);

    if (candidatos) {
      const textoNorm = normalizar(texto);
      tramite = candidatos.find((t) =>
        (t.nombre && textoNorm.includes(normalizar(t.nombre))) ||
        (t.domicilio && textoNorm.includes(normalizar(t.domicilio)))
      ) || null;
    }
  }

  if (!tramite) {
    return res.status(200).json({ found: false, folder_path: 'TEKTON 2026/SIN-CLASIFICAR' });
  }

  const municipioFolder = normalizar(tramite.municipio || 'SIN-MUNICIPIO');
  const clienteFolder = normalizar(tramite.nombre || 'SIN-CLIENTE');

  return res.status(200).json({
    found: true,
    cliente: tramite.nombre,
    municipio: tramite.municipio,
    numero_p: tramite.numero_p,
    folder_path: `TEKTON 2026/${municipioFolder}/${clienteFolder}/02_Municipalidad`,
  });
}
