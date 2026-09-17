import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwxwxqhmzsqreptccczt.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY as string;

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

function extraerExpediente(asunto: string): string | null {
  const match = asunto.match(/(?:Exp(?:te)?\.?\s*N?°?\s*|N[uú]mero:\s*)(\d+)/i);
  return match ? match[1] : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clave = req.query.key || req.headers['x-api-key'];
  if (clave !== process.env.MAKE_SECRET_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const asunto = (req.query.asunto as string) || '';
  const expedienteDirecto = (req.query.expediente as string) || '';
  const expedienteNumero = extraerExpediente(asunto) || expedienteDirecto.match(/\d+/)?.[0];

  let tramite: any = null;

  if (expedienteNumero) {
    const { data } = await supabase
      .from('tramites')
      .select('nombre, municipio, numero_p, n_expediente, domicilio')
      .ilike('n_expediente', `%${expedienteNumero}%`)
      .limit(1);
    if (data && data.length > 0) tramite = data[0];
  }

  if (!tramite && asunto) {
    const { data: candidatos } = await supabase
      .from('tramites')
      .select('nombre, municipio, numero_p, n_expediente, domicilio')
      .eq('finalizado', false);

    if (candidatos) {
      const textoNorm = normalizar(asunto);
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
