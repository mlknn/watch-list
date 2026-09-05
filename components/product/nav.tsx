import { ArrowUpRight } from 'lucide-react';
import {LogoMark} from './logo';
export function Brand() { return <a className="brand" href="/"><span className="brand-logo"><LogoMark/></span>watch<span className="brand-light">list</span></a>; }
export function PublicNav() { return <header className="topbar public-nav"><Brand/><nav aria-label="Main navigation"><a href="/#how-it-works">How it works</a><a href="/pricing">Pricing</a><a href="/login">Log in</a><a className="solid-link" href="/signup">Start watching <ArrowUpRight size={16}/></a></nav></header>; }
export function PublicFooter() { return <footer className="public-footer"><Brand/><span>Good ideas deserve a starting point.</span><a href="/privacy">Privacy</a><a href="/pricing">Plans</a></footer>; }
