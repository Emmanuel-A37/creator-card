/* eslint-disable camelcase */
const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { appLogger } = require('@app-core/logger');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-cards');
const { serializeCard } = require('./helpers/serialize-card');

// ---------------------------------------------------------------------------
// VSL Spec — outer shape validation
// ---------------------------------------------------------------------------
const spec = `root { // Creator card creation
  title string<trim|minlength:3|maxlength:100>
  description? string<trim|maxlength:500>
  creator_reference string<trim|length:20>
  slug? string<trim|minlength:5|maxlength:50>
  links[]? {
    title string<trim|minlength:1|maxlength:100>
    url string<trim|maxlength:200>
  }
  service_rates? {
    currency string<trim|uppercase|isanyof:NGN,USD,GBP,GHS>
    rates[] {
      name string<trim|minlength:3|maxlength:100>
      description string<trim|maxlength:250>
      amount number<min:1>
    }
  }
  status string(draft|published)
  access_type? string(public|private)
  access_code? string<trim|length:6>
}`;

const parsedSpec = validator.parse(spec);

// ---------------------------------------------------------------------------
// Slug helpers — no regex, character-by-character whitelist approach
// ---------------------------------------------------------------------------

/**
 * Generates a URL-safe slug from a title.
 * Allowed output characters: [a-z0-9\-_]
 */
function slugifyTitle(title) {
  const ALLOWED = 'abcdefghijklmnopqrstuvwxyz0123456789-_';
  const lower = title.toLowerCase();
  // Replace spaces with hyphens first
  let withHyphens = '';
  for (let i = 0; i < lower.length; i += 1) {
    withHyphens += lower[i] === ' ' ? '-' : lower[i];
  }
  // Strip all other non-allowed characters
  let result = '';
  for (let i = 0; i < withHyphens.length; i += 1) {
    if (ALLOWED.indexOf(withHyphens[i]) !== -1) {
      result += withHyphens[i];
    }
  }
  return result;
}

/**
 * Generates a 6-character random alphanumeric suffix.
 */
function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

/**
 * Finds a unique slug for a given base, appending a random suffix when needed.
 * Checks ALL records (not just active) to avoid DB unique-index conflicts.
 */
async function resolveUniqueSlug(base) {
  // Use raw model to check ALL records (including deleted) — avoids DB unique index clash
  const RawModel = CreatorCard.raw();
  let candidate = base;
  let existing = await RawModel.findOne({ slug: candidate });
  // Also append suffix if candidate is too short
  if (candidate.length < 5 || existing) {
    candidate = `${base}-${randomSuffix()}`;
    existing = await RawModel.findOne({ slug: candidate });
    // In the extremely unlikely event of a collision, try once more
    if (existing) {
      candidate = `${base}-${randomSuffix()}`;
    }
  }
  return candidate;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

async function createCreatorCard(serviceData) {
  const data = validator.validate(serviceData, parsedSpec);
  let result;

  try {
    // -------------------------------------------------------------------------
    // Additional Validation Checks (beyond VSL limitations)
    // -------------------------------------------------------------------------

    // 1. Slug format validation (letters, numbers, hyphens and underscores only)
    if (data.slug) {
      const slugRegex = /^[a-zA-Z0-9\-_]+$/;
      if (!slugRegex.test(data.slug)) {
        throwAppError(
          'Slug must contain only letters, numbers, hyphens, and underscores',
          'SPCL_VALIDATION'
        );
      }
    }

    // 2. Link URL must start with http:// or https://
    if (data.links) {
      data.links.forEach((link, idx) => {
        if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
          throwAppError(
            `Link URL at index ${idx} must start with http:// or https://`,
            'SPCL_VALIDATION'
          );
        }
      });
    }

    // 3. Currency rates non-empty and amount must be positive integer (min 1)
    if (data.service_rates) {
      if (!data.service_rates.rates || data.service_rates.rates.length === 0) {
        throwAppError(
          'rates must be a non-empty array when service_rates is present',
          'SPCL_VALIDATION'
        );
      }
      data.service_rates.rates.forEach((rate, idx) => {
        if (!Number.isInteger(rate.amount) || rate.amount <= 0) {
          throwAppError(
            `Rate amount at index ${idx} must be a positive integer`,
            'SPCL_VALIDATION'
          );
        }
      });
    }

    // 4. access_code alphanumeric check
    if (data.access_code) {
      const alphaNumericRegex = /^[a-zA-Z0-9]+$/;
      if (!alphaNumericRegex.test(data.access_code)) {
        throwAppError('access_code must contain only letters and numbers', 'SPCL_VALIDATION');
      }
    }

    // Apply default access_type
    if (!data.access_type) {
      data.access_type = 'public';
    }

    // Business rule: private card must have access_code (check before DB)
    if (data.access_type === 'private' && !data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED_FOR_PRIVATE, 'AC01', {
        context: { code: 'AC01' },
      });
    }

    // Business rule: public card must not have access_code (check before DB)
    if (data.access_type === 'public' && data.access_code) {
      throwAppError(CreatorCardMessages.ACCESS_CODE_NOT_ALLOWED_FOR_PUBLIC, 'AC05', {
        context: { code: 'AC05' },
      });
    }

    // Slug handling
    let slug;
    if (data.slug) {
      // Client provided a slug — check uniqueness against ALL records (active + deleted)
      // to avoid DB unique index constraint failures
      const RawModel = CreatorCard.raw();
      const existing = await RawModel.findOne({ slug: data.slug });
      if (existing) {
        throwAppError(CreatorCardMessages.SLUG_ALREADY_TAKEN, 'SL02', {
          context: { code: 'SL02' },
        });
      }
      slug = data.slug;
    } else {
      // Auto-generate slug from title
      const base = slugifyTitle(data.title);
      slug = await resolveUniqueSlug(base);
    }

    // Normalise optional fields
    const access_code = data.access_code || null;

    // Create the record — repository auto-sets created, updated; schema default sets deleted: null
    const card = await CreatorCard.create({
      title: data.title,
      description: data.description,
      creator_reference: data.creator_reference,
      slug,
      links: data.links || [],
      service_rates: data.service_rates || null,
      status: data.status,
      access_type: data.access_type,
      access_code,
    });

    result = serializeCard(card);
  } catch (error) {
    appLogger.errorX(error, 'create-creator-card-error');
    throw error;
  }

  return result;
}

module.exports = createCreatorCard;
