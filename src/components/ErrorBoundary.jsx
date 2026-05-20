import { Component } from 'react';

/**
 * Top-level React error boundary. Catches render-phase errors anywhere in
 * the subtree and shows a fallback. Errors inside event handlers, async
 * callbacks, and Promise rejections are NOT caught here — those are
 * handled by the global window listeners in main.jsx.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to console for local dev; in prod wire to your APM here.

    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback;
      return <Fallback error={this.state.error} reset={this.reset} />;
    }
    return this.props.children;
  }
}
