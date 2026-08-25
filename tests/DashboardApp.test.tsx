import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardApp, { DashboardSection } from '../components/DashboardApp';

const navigation = vi.hoisted(() => ({
  pathname: '/',
  params: '',
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.params),
  useRouter: () => ({ replace: navigation.replace }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href:string; children:ReactNode }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock('recharts', () => {
  const Box = ({ children }: { children?:ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer:Box, AreaChart:Box, BarChart:Box, LineChart:Box,
    CartesianGrid:Box, XAxis:Box, YAxis:Box, Area:Box, Bar:Box, Line:Box,
    Tooltip:Box, Legend:Box, Cell:Box,
  };
});

beforeEach(() => {
  navigation.pathname = '/';
  navigation.params = '';
  navigation.replace.mockReset();
});

afterEach(cleanup);

describe('dashboard interactions', () => {
  it('updates the URL when a global filter changes', async () => {
    const user = userEvent.setup();
    render(<DashboardApp section="overview"/>);
    await user.selectOptions(screen.getByLabelText('Segment'), 'new');
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('/?segment=new', { scroll:false }));
  });

  it('preserves global query filters in navigation links', () => {
    navigation.params = 'segment=active&platform=iOS';
    render(<DashboardApp section="overview"/>);
    expect(screen.getByRole('link', { name:'Delivered Messages' })).toHaveAttribute('href', '/messages?segment=active&platform=iOS');
  });

  it('searches the message performance table', async () => {
    navigation.pathname = '/messages';
    const user = userEvent.setup();
    render(<DashboardApp section="messages"/>);
    await user.type(screen.getByLabelText('Search delivered messages'), 'renewal');
    expect(screen.getByText('Work pass renewal reminder')).toBeInTheDocument();
    expect(screen.queryByText('SkillsFuture credit update')).not.toBeInTheDocument();
  });

  it('preserves the global query on delivery-history detail links', () => {
    navigation.pathname='/messages';
    navigation.params='segment=active&platform=iOS';
    render(<DashboardApp section="messages"/>);
    const links=screen.getAllByRole('link',{name:/Work pass renewal reminder/});
    expect(links[0]).toHaveAttribute('href','/messages/renewal?segment=active&platform=iOS');
  });

  it('renders individual message diagnostics', () => {
    navigation.pathname='/messages/renewal';
    render(<DashboardApp section="message-detail" messageId="renewal"/>);
    expect(screen.getByRole('heading',{name:'Work pass renewal reminder',level:1})).toBeInTheDocument();
    expect(screen.getByRole('heading',{name:'Message clicks by hour'})).toBeInTheDocument();
    expect(screen.getByText('Median time to first open')).toBeInTheDocument();
  });

  it('shows a No CTA state on CTA-less message details', () => {
    navigation.pathname='/messages/wage';
    render(<DashboardApp section="message-detail" messageId="wage"/>);
    expect(screen.getAllByText('No CTA').length).toBeGreaterThan(0);
    expect(screen.getByText('This message has no click-to-conversion journey.')).toBeInTheDocument();
  });

  it.each([
    ['overview','Message Inbox Analytics'],
    ['behaviour','Reading behaviour'],
    ['journey','Action journey'],
    ['segments','Segment comparison'],
    ['health','Friction & technical health'],
  ] as [DashboardSection,string][])('renders the %s route', (section, heading) => {
    render(<DashboardApp section={section}/>);
    expect(screen.getByRole('heading', { name:heading, level:1 })).toBeInTheDocument();
  });
});
