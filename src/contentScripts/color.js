// Mix an array of colors using the multiply blend mode
// Algorithm: https://www.w3.org/TR/compositing/#blendingmultiply
const blend = (colors) => {
	let mix = {r: 1, g: 1, b: 1};
	colors.forEach(c => {
		mix.r *= c.r / 255;
		mix.g *= c.g / 255;
		mix.b *= c.b / 255;
	});

	return {
		r: Math.round(255 * mix.r),
		g: Math.round(255 * mix.g),
		b: Math.round(255 * mix.b)
	};
};

// Convert RGB to a [0,1] color space where gamma is linear
// Linearize: http://entropymine.com/imageworsener/srgbformula/
const linear = (comp) => (comp <= 0.03928)
	? comp / 12.92
	: Math.pow((comp + 0.055) / 1.055, 2.4);

// Luminance formula: https://www.w3.org/WAI/GL/wiki/Relative_luminance
const luminance = (color) =>
	0.2126 * linear(color.r / 255)
	+ 0.7152 * linear(color.g / 255)
	+ 0.0722 * linear(color.b / 255);

// Checks the constrast against black and white
// Contrast ratio formula: https://www.w3.org/WAI/GL/wiki/Contrast_ratio
const isBright = (color) =>
	Math.pow(luminance(color) + 0.05, 2) > 0.0525;

export default {blend, luminance, isBright};
