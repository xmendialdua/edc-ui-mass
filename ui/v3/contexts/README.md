# Contexts

This folder contains React context providers that manage global state across the application.

## Overview

Context providers allow state to be shared between components without having to pass props down manually at every level. This is particularly useful for global settings like language preferences.

## Contexts

### LanguageContext

The `language-context.tsx` file provides a context for managing the application's language settings:

- Supports English and Spanish languages
- Provides translations for all UI text
- Includes a custom hook `useLanguage()` for easy access to language functions

#### Usage

```tsx
import { useLanguage } from "@/contexts/language-context";

function MyComponent() {
  const { language, setLanguage, t } = useLanguage();
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button onClick={() => setLanguage('es')}>
        Switch to Spanish
      </button>
    </div>
  );
}
