/** A device that has signed in to this account. */
export type TrustedDevice = {
  readonly id: string;
  /** "iPhone 15 Pro" */
  readonly name: string;
  readonly location: string;
  /** ISO-8601 timestamp of the last time it was used. */
  readonly lastSeenAt: string;
  /** The device the app is running on right now. */
  readonly isCurrent: boolean;
  readonly trusted: boolean;
};

export type LoginOutcome = 'success' | 'blocked' | 'failed';

/** One sign-in attempt, successful or not. */
export type LoginEvent = {
  readonly id: string;
  readonly deviceName: string;
  readonly location: string;
  readonly occurredAt: string;
  readonly outcome: LoginOutcome;
};

/**
 * What protects the account. Each flag is a stored preference — turning one on
 * is a request to the platform, not proof the platform honoured it.
 */
export type SecuritySettings = {
  /** Device biometrics for sign-in and confirming transfers. */
  readonly biometricsEnabled: boolean;
  readonly twoFactorEnabled: boolean;
  /** Where the second factor is sent, masked. */
  readonly twoFactorDestination: string;
  /** ISO-8601 date the password was last changed. */
  readonly passwordUpdatedAt: string;
  /** Blocks every card and transfer at once. */
  readonly accountFrozen: boolean;
};

/**
 * Whether this device can actually do biometrics.
 *
 * The app must never claim a protection it cannot provide, so the capability
 * is asked for rather than assumed.
 */
export type BiometricCapability = {
  readonly available: boolean;
  /** "Face ID", "Touch ID", "Fingerprint" — what to call it on this device. */
  readonly label: string;
  /** True once the user has enrolled a face or fingerprint. */
  readonly enrolled: boolean;
  /** Why it is unavailable, when it is. */
  readonly unavailableReason?: string;
};
