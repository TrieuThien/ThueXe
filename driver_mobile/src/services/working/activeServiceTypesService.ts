import { apiClient } from '../api/client';
import type { ServiceTypeId, UpdateServiceTypesPayload } from '../../types/working';

// Backend chá»‰ cÃ³ cá» available_for_rental (0/1), khÃ´ng cÃ³ máº£ng service types.
// Mapping: báº¥t ká»³ loáº¡i thuÃª nÃ o (thue_tai_xe, xe_kem_tai_xe) â†’ available_for_rental=1
// goi_xe luÃ´n Ä‘Æ°á»£c coi lÃ  loáº¡i máº·c Ä‘á»‹nh khi driver Ä‘ang online.

const RENTAL_TYPES: ServiceTypeId[] = ['thue_tai_xe', 'xe_kem_tai_xe'];

export const activeServiceTypesService = {
  async getActiveServiceTypes(): Promise<ServiceTypeId[]> {
    try {
      const response = await apiClient.get('/api/driver/working-status');
      const data = response.data.data as { available_for_rental?: number };
      const types: ServiceTypeId[] = ['goi_xe'];
      if (data.available_for_rental === 1) {
        types.push('thue_tai_xe');
      }
      return types;
    } catch {
      return ['goi_xe'];
    }
  },

  async updateActiveServiceTypes(payload: UpdateServiceTypesPayload): Promise<ServiceTypeId[]> {
    const hasRental = payload.serviceTypes.some((t) => RENTAL_TYPES.includes(t));
    const response = await apiClient.patch('/api/driver/working-status/service-type', {
      available_for_rental: hasRental ? 1 : 0
    });
    const data = response.data.data as { available_for_rental?: number };
    const types: ServiceTypeId[] = ['goi_xe'];
    if (data.available_for_rental === 1) {
      types.push('thue_tai_xe');
    }
    return types;
  }
};

