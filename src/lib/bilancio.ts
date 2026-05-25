// src/lib/bilancio.ts
import { supabase } from '@/lib/supabase';
import type { BilancioMovimento } from '@/types';

export const fetchBilancio = async (groupId: string): Promise<BilancioMovimento[]> => {
  const { data, error } = await supabase
    .from('bilancio')
    .select('*')
    .eq('group_id', groupId)
    .order('data', { ascending: false });
  if (error) throw error;
  return data as BilancioMovimento[];
};

export const addBilancioMovimento = async (mov: Omit<BilancioMovimento, 'id' | 'createdAt'>): Promise<BilancioMovimento> => {
  const { data, error } = await supabase.from('bilancio').insert({ ...mov }).single();
  if (error) throw error;
  return data as BilancioMovimento;
};

export const updateBilancioMovimento = async (id: string, updates: Partial<BilancioMovimento>) => {
  const { data, error } = await supabase.from('bilancio').update(updates).eq('id', id).single();
  if (error) throw error;
  return data as BilancioMovimento;
};

export const deleteBilancioMovimento = async (id: string) => {
  const { error } = await supabase.from('bilancio').delete().eq('id', id);
  if (error) throw error;
};
