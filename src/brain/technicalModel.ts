import * as tf from '@tensorflow/tfjs';

/**
 * Technical Model: Fits a rapid client-side Linear Regression / Simple Neural Layer 
 * locally inside the browser memory. It takes the last sequential block of closing prices (e.g. 30 days) 
 * to project the immediate next price action vector.
 */
export const predictTechnicalScore = async (prices: number[]): Promise<number> => {
    if (!prices || prices.length < 5) return 0; // Not enough data points

    try {
        // Force TensorFlow to utilize pure JS CPU environment if WebGL context was previously blocked
        await tf.setBackend('cpu');
        await tf.ready();

        // Normalize data between 0 and 1 so TF can converge efficiently
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice || 1;
        const normalizedPrices = prices.map(p => (p - minPrice) / range);

        // We map indices [0, 1, 2...] as X, and prices as Y
        const rawXs = Array.from({ length: normalizedPrices.length }, (_, i) => i / (normalizedPrices.length - 1));

        const xs = tf.tensor2d(rawXs, [rawXs.length, 1]);
        const ys = tf.tensor2d(normalizedPrices, [normalizedPrices.length, 1]);

        // Define a lightweight single dense layer sequential model
        const model = tf.sequential();
        model.add(tf.layers.dense({ units: 1, inputShape: [1] }));

        // Prepare the model for training: Specify the loss and the optimizer
        model.compile({
            loss: 'meanSquaredError',
            optimizer: tf.train.sgd(0.2) // Quick stochastic gradient descent 
        });

        // Train the model silently on the browser thread (small data size so fast execution)
        await model.fit(xs, ys, { epochs: 30, verbose: 0 });

        // Predict the next sequence step natively
        const nextTargetX = 1 + (1 / normalizedPrices.length); // Next index sequence float
        const nextX = tf.tensor2d([nextTargetX], [1, 1]);
        const predictedY = model.predict(nextX) as tf.Tensor;

        const predictedNormalizedVal = (await predictedY.data())[0];
        const lastNormalizedVal = normalizedPrices[normalizedPrices.length - 1];

        // Cleanup tensors to prevent memory leaks in React app
        xs.dispose();
        ys.dispose();
        nextX.dispose();
        predictedY.dispose();
        model.dispose();

        // If predicted next price is vastly higher, score positive (+1.0)
        // If predicted next price is vastly lower, score negative (-1.0)
        const difference = predictedNormalizedVal - lastNormalizedVal;

        // Bound extreme slopes using Math.tanh
        return Math.max(-1, Math.min(1, Math.tanh(difference * 50)));

    } catch (e) {
        // If the browser strictly forbids WebGL bindings or tensor allocation fails, fail safely.
        console.warn("TensorFlow engine WebGL/CPU Context failed. Defaulting sequence prediction to Neutral (0).", e);
        return 0;
    }
};
