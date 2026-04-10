import React from 'react';
import { AppButton } from '../common/AppButton';

export const RetryState = ({ onRetry }: { onRetry: () => void }) => (
  <AppButton title="Tải lại" onPress={onRetry} />
);
