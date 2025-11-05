import { Redirect } from 'expo-router';
import React from 'react';

export default function LoginRedirect() {
  // This file is intentionally left as a redirect to the new index (login) page.
  return <Redirect href="/" />;
}
