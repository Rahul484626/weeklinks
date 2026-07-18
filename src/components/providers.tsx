"use client";

import React, { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import Link, { LinkProps } from "next/link";

type TransitionContextType = {
  isPending: boolean;
  navigate: (href: string) => void;
};

const TransitionContext = createContext<TransitionContextType | null>(null);

export function usePageTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) throw new Error("usePageTransition must be used within Providers");
  return ctx;
}

export function Providers({ children, session }: { children: React.ReactNode; session: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <SessionProvider session={session}>
      <TransitionContext.Provider value={{ isPending, navigate }}>
        {children}
      </TransitionContext.Provider>
    </SessionProvider>
  );
}

interface TransitionLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function TransitionLink({ children, href, className, onClick, ...props }: TransitionLinkProps) {
  const { navigate } = usePageTransition();

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (onClick) onClick(e);
        if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          navigate(href.toString());
        }
      }}
      {...props}
    >
      {children}
    </Link>
  );
}

