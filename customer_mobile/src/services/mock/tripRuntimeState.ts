import { TripStatus } from "../../types";

export const tripRuntimeState: {
  activeStepIndex: number;
  trackingTick: number;
  forcedActiveStatus?: TripStatus;
} = {
  activeStepIndex: 0,
  trackingTick: 0,
  forcedActiveStatus: undefined,
};
