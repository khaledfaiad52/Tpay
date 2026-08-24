import { NotFoundError } from '@/services/contracts';
import type { BenefitsService } from '@/services/contracts';
import type { Benefit } from '@/types';
import { mockBenefits } from './data/fixtures';
import { respond } from './latency';

/** Words used in the Home caption, in the order the design shows them. */
const HIGHLIGHT_BY_CATEGORY: Partial<Record<Benefit['category'], string>> = {
  'medical-insurance': 'medical',
  wellness: 'wellness',
  discounts: 'discounts',
  'financial-services': 'financial',
};

export const mockBenefitsService: BenefitsService = {
  listBenefits: () => respond('benefitsService.listBenefits', mockBenefits),

  getBenefit: (benefitId) => {
    const benefit = mockBenefits.find((candidate) => candidate.id === benefitId);
    if (!benefit) return Promise.reject(new NotFoundError('Benefit', benefitId));
    return respond('benefitsService.getBenefit', benefit);
  },

  getSummary: () => {
    const active = mockBenefits.filter((benefit) => benefit.status === 'active');
    const highlights = active
      .map((benefit) => HIGHLIGHT_BY_CATEGORY[benefit.category])
      .filter((word): word is string => Boolean(word));
    return respond('benefitsService.getSummary', {
      activeCount: active.length,
      highlights: [...new Set(highlights)].slice(0, 3),
    });
  },
};
