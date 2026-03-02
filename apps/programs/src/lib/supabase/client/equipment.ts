/**
 * Client-side equipment and zones. Replaces firebase/admin/equipment.
 * RLS: authenticated read, admin write.
 */

import { supabase } from '../client';

export interface EquipmentItem {
  id: string;
  name: string;
  category: 'resistance' | 'cardio' | 'utility';
}

export interface Zone {
  id: string;
  name: string;
  category: 'domestic' | 'commercial' | 'amenity' | 'outdoor';
  description: string;
  biomechanicalConstraints: string[];
  equipmentIds: string[];
  createdAt: Date;
}

interface EquipmentRow {
  id: string;
  name: string;
  category: string;
}

interface ZoneRow {
  id: string;
  name: string;
  category: string;
  description?: string | null;
  biomechanical_constraints?: string[] | null;
  equipment_ids?: string[] | null;
  created_at?: string | null;
}

function mapEquipment(row: EquipmentRow): EquipmentItem {
  return { id: row.id, name: row.name, category: row.category as EquipmentItem['category'] };
}

function mapZone(row: ZoneRow): Zone {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Zone['category'],
    description: row.description ?? '',
    biomechanicalConstraints: row.biomechanical_constraints ?? [],
    equipmentIds: row.equipment_ids ?? [],
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  };
}

export async function getAllEquipmentItems(): Promise<EquipmentItem[]> {
  const { data, error } = await supabase.from('equipment_inventory').select('*');
  if (error) throw error;
  return (data ?? []).map(mapEquipment);
}

export async function createEquipmentItem(data: Omit<EquipmentItem, 'id'>): Promise<string> {
  const { data: row, error } = await supabase
    .from('equipment_inventory')
    .insert({ name: data.name, category: data.category })
    .select('id')
    .single();
  if (error) throw error;
  return row.id;
}

export async function deleteEquipmentItem(id: string): Promise<void> {
  const { error } = await supabase.from('equipment_inventory').delete().eq('id', id);
  if (error) throw error;
}

export async function getAllZones(): Promise<Zone[]> {
  const { data, error } = await supabase.from('equipment_zones').select('*');
  if (error) throw error;
  return (data ?? []).map(mapZone);
}

export async function getZoneById(id: string): Promise<Zone | null> {
  const { data, error } = await supabase.from('equipment_zones').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data ? mapZone(data) : null;
}

export async function createZone(data: Omit<Zone, 'id' | 'createdAt'>): Promise<string> {
  const { data: row, error } = await supabase
    .from('equipment_zones')
    .insert({
      name: data.name,
      category: data.category,
      description: data.description,
      biomechanical_constraints: data.biomechanicalConstraints ?? [],
      equipment_ids: data.equipmentIds ?? [],
    })
    .select('id')
    .single();
  if (error) throw error;
  return row.id;
}

export async function updateZone(
  id: string,
  data: Partial<Omit<Zone, 'id' | 'createdAt'>>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name != null) payload.name = data.name;
  if (data.category != null) payload.category = data.category;
  if (data.description != null) payload.description = data.description;
  if (data.biomechanicalConstraints != null)
    payload.biomechanical_constraints = data.biomechanicalConstraints;
  if (data.equipmentIds != null) payload.equipment_ids = data.equipmentIds;
  const { error } = await supabase.from('equipment_zones').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteZone(id: string): Promise<void> {
  const { error } = await supabase.from('equipment_zones').delete().eq('id', id);
  if (error) throw error;
}

export async function seedDefaultData(): Promise<{
  equipmentItemsCreated: number;
  zonesCreated: number;
}> {
  const { data: existingEq } = await supabase.from('equipment_inventory').select('id');
  const { data: existingZones } = await supabase.from('equipment_zones').select('id');
  let equipmentItemsCreated = 0;
  let zonesCreated = 0;

  const defaultEquipment: Array<Omit<EquipmentItem, 'id'>> = [
    { name: 'Floor space', category: 'utility' },
    { name: 'Chair', category: 'utility' },
    { name: 'Bands', category: 'resistance' },
    { name: 'Door Anchor', category: 'utility' },
    { name: 'Foam Roller', category: 'utility' },
    { name: 'Dumbbells', category: 'resistance' },
    { name: 'Pull-up Bar', category: 'resistance' },
    { name: 'Power Rack', category: 'resistance' },
    { name: 'Barbell', category: 'resistance' },
    { name: 'Plates', category: 'resistance' },
    { name: 'Kettlebells', category: 'resistance' },
    { name: 'Jump Rope', category: 'cardio' },
    { name: 'Cable Tower', category: 'resistance' },
    { name: 'Machines', category: 'resistance' },
    { name: 'Smith Machine', category: 'resistance' },
    { name: 'Treadmill', category: 'cardio' },
    { name: 'Elliptical', category: 'cardio' },
    { name: 'Yoga Mat', category: 'utility' },
    { name: 'Bench', category: 'utility' },
  ];

  const equipmentIds: Record<string, string> = {};

  if (!existingEq?.length) {
    for (const item of defaultEquipment) {
      const id = await createEquipmentItem(item);
      equipmentIds[item.name] = id;
      equipmentItemsCreated++;
    }
  } else {
    const items = await getAllEquipmentItems();
    items.forEach((item) => {
      equipmentIds[item.name] = item.id;
    });
  }

  if (!existingZones?.length) {
    const defaultZones: Array<Omit<Zone, 'id' | 'createdAt'>> = [
      {
        name: 'Living Room (Minimalist)',
        category: 'domestic',
        description: 'Minimal equipment setup for small spaces',
        biomechanicalConstraints: ['Load Limited', 'Variable Resistance', 'Stabilizer Heavy'],
        equipmentIds: ['Bands', 'Door Anchor', 'Yoga Mat', 'Foam Roller']
          .map((n) => equipmentIds[n])
          .filter(Boolean),
      },
      {
        name: 'Home Gym (Garage Iron)',
        category: 'domestic',
        description: 'Full home gym setup with heavy lifting equipment',
        biomechanicalConstraints: ['No Limits', 'Fixed Bar Path', 'Vector Freedom'],
        equipmentIds: ['Power Rack', 'Barbell', 'Plates', 'Bench', 'Kettlebells']
          .map((n) => equipmentIds[n])
          .filter(Boolean),
      },
      {
        name: 'Hotel (Standard)',
        category: 'amenity',
        description: 'Standard hotel gym equipment',
        biomechanicalConstraints: ['Load Limited', 'The 50lb Ceiling', 'Fixed Planes'],
        equipmentIds: ['Dumbbells', 'Bench', 'Treadmill', 'Elliptical']
          .map((n) => equipmentIds[n])
          .filter(Boolean),
      },
      {
        name: 'Big Box Gym',
        category: 'commercial',
        description: 'Full commercial gym with all equipment available',
        biomechanicalConstraints: ['No Limits', 'High Variety', 'Vector Freedom'],
        equipmentIds: Object.values(equipmentIds),
      },
    ];
    for (const zone of defaultZones) {
      await createZone(zone);
      zonesCreated++;
    }
  }

  return { equipmentItemsCreated, zonesCreated };
}
