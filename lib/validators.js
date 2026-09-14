import { z } from 'zod';

const consentError = { errorMap: () => ({ message: 'All terms must be accepted.' }) };

const optionalString = (schema) =>
  z
    .union([schema, z.literal(''), z.null()])
    .transform((value) => (value ? value : null))
    .optional();

const instagramHandleSchema = z
  .string()
  .min(2)
  .regex(/^[a-z0-9_.]+$/i, 'Instagram username can only include letters, numbers, periods, and underscores.');

export const registerSchema = z
  .object({
    email: z.string().email(),
    instagramHandle: optionalString(instagramHandleSchema),
    hasInstagram: z.boolean().optional().default(true),
    preferredContactMethod: optionalString(
      z.string().min(3, 'Please let us know how to reach you.')
    ),
    password: z.string().min(6),
    firstName: z.string().min(1, 'Please provide your first name.'),
    lastName: z.string().min(1, 'Please provide your last name.'),
    preferredName: optionalString(z.string().min(1, 'Preferred name must have at least one character.')),
    shareFirstName: z.boolean(),
    phoneNumber: optionalString(z.string().min(7, 'Please provide at least 7 digits.')),
    profilePhotoUrl: z.string().min(1, 'Please upload a private reference photo.'),
    profilePhotoOriginalUrl: z.string().min(1, 'Please upload a private reference photo.'),
    termsConsentCulture: z.literal(true, consentError),
    termsSafeSpace: z.literal(true, consentError),
    termsNoHate: z.literal(true, consentError),
    termsPrivacy: z.literal(true, consentError),
    termsGuidelines: z.literal(true, consentError),
    generalPhotoConsent: z.boolean(),
    groupFaceConsent: z.boolean(),
    otherFaceConsent: z.boolean(),
    taggingConsent: z.boolean()
  })
  .superRefine((data, ctx) => {
    if (data.shareFirstName === false && !data.preferredName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please provide a preferred name if you do not want your first name displayed.',
        path: ['preferredName']
      });
    }
    const hasInstagram = data.hasInstagram !== false;
    if (hasInstagram && !data.instagramHandle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Instagram username is required unless you opt out.',
        path: ['instagramHandle']
      });
    }
    if (!hasInstagram && !data.preferredContactMethod) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please share how we can reach you.',
        path: ['preferredContactMethod']
      });
    }
  });

export const eventSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/i),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  threadId: optionalString(
    z.string().min(3, 'Thread ID must be at least 3 characters.')
  ),
  groupChatLink: optionalString(
    z
      .string()
      .url('Group chat link must be a valid URL starting with http or https.')
  ),
  galleryUrl: optionalString(
    z
      .string()
      .url('Gallery link must be a valid URL starting with http or https.')
  ),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  signupDeadline: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  published: z.boolean().optional()
});

export const eventSignupSchema = z.object({
  specialRequests: optionalString(
    z.string().max(1000, 'Special requests should be under 1000 characters.')
  ).optional()
});

export const placeholderUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  preferredName: optionalString(z.string().min(1, 'Preferred name should have at least one character.')),
  instagramHandle: instagramHandleSchema
});

export const placeholderBatchSchema = z.object({
  users: z
    .array(placeholderUserSchema)
    .min(1, 'Please provide at least one placeholder member.')
});

export const profileUpdateSchema = z
  .object({
    firstName: z.string().min(1, 'Please provide your first name.'),
    lastName: z.string().min(1, 'Please provide your last name.'),
    preferredName: optionalString(z.string().min(1, 'Preferred name must have at least one character.')),
    shareFirstName: z.boolean(),
    phoneNumber: optionalString(z.string().min(7, 'Please provide at least 7 digits.')),
    preferredContactMethod: optionalString(
      z.string().min(3, 'Please let us know how to reach you.')
    ),
    profilePhotoUrl: optionalString(z.string()),
    profilePhotoOriginalUrl: optionalString(z.string()),
    termsConsentCulture: z.literal(true, consentError),
    termsSafeSpace: z.literal(true, consentError),
    termsNoHate: z.literal(true, consentError),
    termsPrivacy: z.literal(true, consentError),
    termsGuidelines: z.literal(true, consentError),
    generalPhotoConsent: z.boolean(),
    groupFaceConsent: z.boolean(),
    otherFaceConsent: z.boolean(),
    taggingConsent: z.boolean()
  })
  .superRefine((data, ctx) => {
    if (data.shareFirstName === false && !data.preferredName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please provide a preferred name if you do not want your first name displayed.',
        path: ['preferredName']
      });
    }
  });

export const passwordResetRequestSchema = z.object({
  identifier: z.string().min(2, 'Please enter your email or Instagram username.')
});

export const passwordResetSchema = z.object({
  token: z.string().min(10, 'Reset link is missing or invalid.'),
  password: z.string().min(6, 'Password must be at least 6 characters.')
});
