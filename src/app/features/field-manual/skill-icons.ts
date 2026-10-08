import type { FieldSkill } from '../../core/program/field-manual.seed';
import type { IconName } from '../../shared/icon/icon';

/** A pictogram for each kind of practical skill: a hatchet for tools, a rope for knots. */
export const SKILL_ICONS: Record<FieldSkill, IconName> = {
  tool: 'hatchet',
  knot: 'knot',
  navigation: 'compass',
};
