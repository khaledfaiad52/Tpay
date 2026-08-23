import type { BenefitsService } from '@/services/contracts';
import type { Benefit } from '@/types';
import { mockBenefits } from './data/fixtures';
import { respond } from './latency';

/** Words used in the Home caption, in the order the design shows them. */
const HIGHLIGHT_BY_CATEGORY: Partial<Record<Benefit['category'], string>> = {
  'medical-insurance': 'medical',
  wellness: 'wellness',
  discounts: 'discounts',
};

export const mockBenefitsService: BenefitsService = {
  listBenefits: () => respond('benefitsService.listBenefits', mockBenefits),

  getSummary: () => {
    const active = mockBenefits.filter((benefit) => benefit.status === 'active');
    const highlights = active
      .map((benefit) => HIGHLIGHT_BY_CATEGORY[benefit.category])
      .filter((word): word is string => Boolean(word));
    return respond('benefitsService.getSummary', {
      activeCount: active.length,
      highlights: [...new Set(highlights)],
    });
  },
};
