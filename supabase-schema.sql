-- CONSULTAS
create table consultas (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  nombre text not null,
  celular text,
  domicilio text,
  municipio text,
  tramite text,
  prioridad text,
  firma text,
  firmante_nombre text,
  firmante_apellido text,
  firmante_direccion text,
  firmante_mat_provincial text,
  firmante_mat_municipal text,
  escritura text,
  sociedad text,
  como_conocio text,
  observaciones text,
  estado text default 'pendiente_validacion',
  -- respuesta tecnica
  ajusta_cou text,
  cou_observaciones text,
  consulta_previa boolean,
  visita_previa boolean,
  visita_dias text,
  derechos_estimados numeric,
  derechos_m2 numeric,
  aportes_estimados numeric,
  aportes_m2 numeric,
  obs_presupuesto text,
  info_faltante text
);

-- PRESUPUESTOS
create table presupuestos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  numero serial,
  consulta_id uuid references consultas(id),
  nombre text,
  domicilio text,
  municipio text,
  tramite text,
  intro text,
  honorarios jsonb,
  forma_pago text,
  derechos_estimados text,
  aportes_estimados text,
  vigencia_dias integer default 7,
  estado text default 'borrador',
  enviado_at timestamptz,
  email_cliente text,
  resultado text,
  motivo_rechazo text,
  descuento_original numeric,
  descuento_final numeric,
  notas_interaccion text
);

-- TRAMITES
create table tramites (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  presupuesto_id uuid references presupuestos(id),
  consulta_id uuid references consultas(id),
  nombre text,
  celular text,
  domicilio text,
  municipio text,
  tramite text,
  prioridad text,
  firma text,
  firmante_nombre text,
  firmante_apellido text,
  firmante_mat_provincial text,
  firmante_mat_municipal text,
  dibujante text,
  n_parcelaria text,
  n_expediente text,
  estado_actual text default 'anticipo_abonado',
  pelota text default 'silvina',
  ultima_nota text,
  ultima_accion_at timestamptz default now(),
  ultima_accion_por text
);

-- MOVIMIENTOS (historial de cada tramite)
create table movimientos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  tramite_id uuid references tramites(id),
  estado text,
  nota text,
  pelota text,
  registrado_por text
);

-- COBROS
create table cobros (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  tramite_id uuid references tramites(id),
  tipo text, -- anticipo, segunda_cuota, saldo
  monto_usd numeric,
  forma_cobro text, -- efectivo_usd, efectivo_pesos, transferencia
  monto_pesos numeric,
  tipo_cambio numeric,
  factura text, -- si_arca, no_por_ahora, sin_factura
  estado text default 'pendiente', -- pendiente, cobrado
  cobrado_at timestamptz
);

-- COSTOS
create table costos (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  tramite_id uuid references tramites(id),
  tipo text, -- dibujante, mansilla, imprenta, extra
  detalle text,
  monto_usd numeric,
  es_general boolean default false
);

-- Habilitar RLS (Row Level Security) - por ahora permisivo para desarrollo
alter table consultas enable row level security;
alter table presupuestos enable row level security;
alter table tramites enable row level security;
alter table movimientos enable row level security;
alter table cobros enable row level security;
alter table costos enable row level security;

-- Políticas permisivas para desarrollo (cambiar antes de producción)
create policy "Allow all consultas" on consultas for all using (true) with check (true);
create policy "Allow all presupuestos" on presupuestos for all using (true) with check (true);
create policy "Allow all tramites" on tramites for all using (true) with check (true);
create policy "Allow all movimientos" on movimientos for all using (true) with check (true);
create policy "Allow all cobros" on cobros for all using (true) with check (true);
create policy "Allow all costos" on costos for all using (true) with check (true);
