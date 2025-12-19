const fs = require('fs');
const path = require('path');

const filePath = path.join(
  process.cwd(),
  'frontend/src/pages/ModernBookingPage.tsx',
);
console.log('Reading file from:', filePath);

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix 1: Stepper container margin
  // Match the comment and the div, preserving exact whitespace
  const stepperRegex =
    /(\{\/\* Stepper de progression \*\/\}\s+)<div className="mb-8">/;
  if (stepperRegex.test(content)) {
    content = content.replace(stepperRegex, '$1<div className="mb-12">');
    console.log('Fixed stepper margin');
  } else {
    console.log('Stepper margin pattern not found');
  }

  // Fix 2: Connector line negative margin
  const lineRegex = /h-0\.5 flex-1 mx-2 -mt-6/;
  if (lineRegex.test(content)) {
    content = content.replace(lineRegex, 'h-0.5 flex-1 mx-2');
    console.log('Fixed connector line alignment');
  } else {
    console.log('Connector line pattern not found');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Write complete');
} catch (err) {
  console.error('Error:', err);
}
