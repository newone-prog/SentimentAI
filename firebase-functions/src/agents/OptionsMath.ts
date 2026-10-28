export class OptionsMath {
  /**
   * Cumulative normal distribution function (CDF)
   */
  private static CND(x: number): number {
    const a1 = 0.31938153;
    const a2 = -0.356563782;
    const a3 = 1.781477937;
    const a4 = -1.821255978;
    const a5 = 1.330274429;
    
    const L = Math.abs(x);
    const K = 1.0 / (1.0 + 0.2316419 * L);
    const w = 1.0 - 1.0 / Math.sqrt(2 * Math.PI) * Math.exp(-L * L / 2) * (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
    
    if (x < 0) {
      return 1.0 - w;
    }
    return w;
  }

  /**
   * Standard normal probability density function (PDF)
   */
  private static ND(x: number): number {
    return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  }

  /**
   * Calculate all Greeks for a given option
   * @param S Current underlying price
   * @param K Strike price
   * @param T Time to expiration in years (e.g., 30 days = 30/365)
   * @param r Risk-free interest rate (e.g., 0.07 for 7% in India)
   * @param v Implied volatility (e.g., 0.15 for 15%)
   * @param type 'CE' for Call, 'PE' for Put
   */
  public static calculateGreeks(S: number, K: number, T: number, r: number, v: number, type: 'CE' | 'PE') {
    // If time is extremely small or zero, fallback to avoid Infinity/NaN
    if (T <= 0 || v <= 0) {
      return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
    }

    const d1 = (Math.log(S / K) + (r + (v * v) / 2) * T) / (v * Math.sqrt(T));
    const d2 = d1 - v * Math.sqrt(T);

    const nd1 = this.ND(d1);
    const cd1 = this.CND(d1);
    const cd2 = this.CND(d2);

    let delta = 0;
    let theta = 0;
    let rho = 0;

    const gamma = nd1 / (S * v * Math.sqrt(T));
    const vega = (S * nd1 * Math.sqrt(T)) / 100; // Divided by 100 for 1% change

    if (type === 'CE') {
      delta = cd1;
      theta = (-(S * v * nd1) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * cd2) / 365; // Daily
      rho = (K * T * Math.exp(-r * T) * cd2) / 100;
    } else {
      delta = cd1 - 1;
      theta = (-(S * v * nd1) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * this.CND(-d2)) / 365; // Daily
      rho = (-K * T * Math.exp(-r * T) * this.CND(-d2)) / 100;
    }

    return {
      delta: isNaN(delta) ? 0 : delta,
      gamma: isNaN(gamma) ? 0 : gamma,
      theta: isNaN(theta) ? 0 : theta,
      vega: isNaN(vega) ? 0 : vega,
      rho: isNaN(rho) ? 0 : rho
    };
  }
}
