import { TRIP_STATUS_LABELS, TRIP_STATUS_TONES } from "../../constants";
import { TripStatus } from "../../types";
import { AppBadge } from "../ui";

interface TripStatusBadgeProps {
  status: TripStatus;
}

export function TripStatusBadge({ status }: TripStatusBadgeProps) {
  return <AppBadge text={TRIP_STATUS_LABELS[status]} tone={TRIP_STATUS_TONES[status]} />;
}
