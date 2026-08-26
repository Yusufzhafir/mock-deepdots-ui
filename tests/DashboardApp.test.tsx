import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import DashboardApp, { DashboardSection } from '../components/DashboardApp';
import { messages } from '../lib/data';

const navigation = vi.hoisted(() => ({
  pathname: '/',
  params: '',
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: navigation.pathname,
    search: navigation.params ? `?${navigation.params}` : '',
  }),
  useNavigate: () => navigation.navigate,
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('recharts', () => {
  const Box = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Box,
    AreaChart: Box,
    BarChart: Box,
    LineChart: Box,
    CartesianGrid: Box,
    XAxis: Box,
    YAxis: Box,
    Area: Box,
    Bar: Box,
    Line: Box,
    Tooltip: Box,
    Legend: Box,
    Cell: Box,
  };
});

beforeEach(() => {
  navigation.pathname = '/';
  navigation.params = '';
  navigation.navigate.mockReset();
});

afterEach(cleanup);

describe('dashboard interactions', () => {
  it('updates the URL when a global filter changes', async () => {
    const user = userEvent.setup();
    render(<DashboardApp section="overview" />);
    await user.selectOptions(screen.getByLabelText('Segment'), 'new');
    await waitFor(() =>
      expect(navigation.navigate).toHaveBeenCalledWith(
        { pathname: '/', search: '?segment=new' },
        { replace: true, preventScrollReset: true },
      ),
    );
  });

  it('preserves global query filters in navigation links', () => {
    navigation.params = 'segment=active&platform=iOS';
    render(<DashboardApp section="overview" />);
    expect(screen.getByRole('link', { name: 'Delivered Messages' })).toHaveAttribute(
      'href',
      '/messages?segment=active&platform=iOS',
    );
  });

  it('keeps existing filters when another dashboard filter changes', async () => {
    navigation.params = 'period=7&segment=active&platform=iOS';
    const user = userEvent.setup();
    render(<DashboardApp section="overview" />);
    await user.selectOptions(screen.getByLabelText('Message type'), 'Reminder');
    await waitFor(() =>
      expect(navigation.navigate).toHaveBeenCalledWith(
        {
          pathname: '/',
          search: '?period=7&segment=active&type=Reminder&platform=iOS',
        },
        { replace: true, preventScrollReset: true },
      ),
    );
  });

  it('renders timing, heatmap, then the performance table in the requested order', () => {
    render(<DashboardApp section="overview" />);
    const headings = [
      screen.getByRole('heading', { name: 'Time to first open' }),
      screen.getByRole('heading', { name: 'Time from open to action click' }),
      screen.getByRole('heading', { name: 'Best time to send' }),
      screen.getByRole('heading', { name: 'Top 5 Message Performance' }),
    ];
    for (let index = 0; index < headings.length - 1; index += 1) {
      expect(
        headings[index].compareDocumentPosition(headings[index + 1]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(screen.getAllByRole('img', { name: /open rate/ })).toHaveLength(7 * 24);
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });

  it('explains the timing denominators on the overview', () => {
    render(<DashboardApp section="overview" />);
    expect(screen.getByText(/Percent of delivered recipients/)).toBeInTheDocument();
    expect(
      screen.getByText(/Percent of opened recipients on CTA-bearing messages/),
    ).toBeInTheDocument();
  });

  it('searches the message performance table', async () => {
    navigation.pathname = '/messages';
    const user = userEvent.setup();
    render(<DashboardApp section="messages" />);
    await user.type(screen.getByLabelText('Search delivered messages'), 'renewal');
    expect(screen.getByText('Work pass renewal reminder')).toBeInTheDocument();
    expect(screen.queryByText('SkillsFuture credit update')).not.toBeInTheDocument();
  });

  it('preserves the global query on delivery-history detail links', () => {
    navigation.pathname = '/messages';
    navigation.params = 'segment=active&platform=iOS';
    render(<DashboardApp section="messages" />);
    const links = screen.getAllByRole('link', { name: /Work pass renewal reminder/ });
    expect(links[0]).toHaveAttribute('href', '/messages/renewal?segment=active&platform=iOS');
  });

  it('renders individual message diagnostics', () => {
    navigation.pathname = '/messages/renewal';
    render(<DashboardApp section="message-detail" messageId="renewal" />);
    expect(
      screen.getByRole('heading', { name: 'Work pass renewal reminder', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Message opens by hour' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Time from open to action click' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Median time to first open')).toBeInTheDocument();
  });

  it('shows a No action button state on CTA-less message details', () => {
    navigation.pathname = '/messages/wage';
    render(<DashboardApp section="message-detail" messageId="wage" />);
    expect(screen.getAllByText('No action button').length).toBeGreaterThan(0);
    expect(
      screen.getByText('This message has no click-to-conversion journey.'),
    ).toBeInTheDocument();
  });

  it('suppresses action timing when the opened-recipient base is below 50', () => {
    const record = messages.find((message) => message.id === 'renewal')!;
    const originalOpened = record.opened;
    record.opened = 49;
    try {
      navigation.pathname = '/messages/renewal';
      render(<DashboardApp section="message-detail" messageId="renewal" />);
      expect(screen.getByText('Not enough data')).toBeInTheDocument();
      expect(
        screen.getByText('At least 50 opened recipients are required to show this distribution.'),
      ).toBeInTheDocument();
    } finally {
      record.opened = originalOpened;
    }
  });

  it.each([
    ['overview', 'Message Inbox Analytics'],
    ['behaviour', 'Reading behaviour'],
    ['journey', 'Action journey'],
    ['segments', 'Segment comparison'],
    ['health', 'Friction & technical health'],
  ] as [DashboardSection, string][])('renders the %s route', (section, heading) => {
    render(<DashboardApp section={section} />);
    expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
  });
});
