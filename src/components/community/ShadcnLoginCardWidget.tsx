import type { CSSProperties } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type ShadcnLoginCardWidgetProps = {
  title?: string;
  description?: string;
  emailLabel?: string;
  passwordLabel?: string;
  actionLabel?: string;
  secondaryActionLabel?: string;
  alternateActionLabel?: string;
  titleTextStyle?: CSSProperties;
  descriptionTextStyle?: CSSProperties;
  fieldLabelTextStyle?: CSSProperties;
  fieldTextStyle?: CSSProperties;
  buttonTextStyle?: CSSProperties;
  footerTextStyle?: CSSProperties;
};

export function ShadcnLoginCardWidget({
  title = 'Login to your account',
  description = 'Enter your email below to login to your account',
  emailLabel = 'Email',
  passwordLabel = 'Password',
  actionLabel = 'Login',
  secondaryActionLabel = 'Login with Google',
  alternateActionLabel = 'Sign Up',
  titleTextStyle,
  descriptionTextStyle,
  fieldLabelTextStyle,
  fieldTextStyle,
  buttonTextStyle,
  footerTextStyle,
}: ShadcnLoginCardWidgetProps) {
  return (
    <Card
      data-source="shadcn/ui Card login example"
      className="flex h-full w-full flex-col p-6"
    >
      <div className="flex flex-col gap-1.5">
        <h3 className="text-2xl font-semibold leading-none tracking-tight text-hr-text" style={titleTextStyle}>{title}</h3>
        <p className="text-sm text-hr-muted" style={descriptionTextStyle}>{description}</p>
      </div>
      <div className="mt-6 flex min-h-0 flex-1 flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm font-medium text-hr-text" style={fieldLabelTextStyle}>
          {emailLabel}
          <input
            readOnly
            type="email"
            placeholder="m@example.com"
            className="h-10 rounded-md border border-hr-border bg-hr-bg px-3 text-sm text-hr-text outline-none placeholder:text-hr-muted"
            style={fieldTextStyle}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-medium text-hr-text" style={fieldLabelTextStyle}>
          <span className="flex items-center justify-between gap-3">
            {passwordLabel}
            <span className="text-xs font-normal text-hr-muted underline-offset-4" style={fieldLabelTextStyle}>Forgot your password?</span>
          </span>
          <input
            readOnly
            type="password"
            value="password"
            className="h-10 rounded-md border border-hr-border bg-hr-bg px-3 text-sm text-hr-text outline-none"
            style={fieldTextStyle}
          />
        </label>
        <div className="mt-auto flex flex-col gap-2">
          <Button className="h-10 w-full" style={buttonTextStyle}>{actionLabel}</Button>
          <Button variant="outline" className="h-10 w-full" style={buttonTextStyle}>{secondaryActionLabel}</Button>
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-hr-muted" style={footerTextStyle}>
        Don&apos;t have an account? <span className="font-medium text-hr-text underline-offset-4" style={footerTextStyle}>{alternateActionLabel}</span>
      </p>
    </Card>
  );
}
