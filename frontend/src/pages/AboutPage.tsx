import { Eye, Cpu, Navigation, Layers, Scan } from 'lucide-react';

const steps = [
  {
    icon: Eye,
    title: 'Watching the Weather',
    description:
      'FloodLens wakes up street cameras automatically when rainfall crosses heavy thresholds in any Delhi zone. No human operator needed — the system watches IMD weather feeds and activates monitoring within minutes.',
    color: 'bg-forest',
  },
  {
    icon: Cpu,
    title: 'Smart Camera Eyes',
    description:
      'Our vision models measure water depth by analyzing how much of vehicle tires and road curbs are submerged. It can tell the difference between a puddle and a flooded underpass in seconds.',
    color: 'bg-amber',
  },
  {
    icon: Navigation,
    title: 'Guiding You Safely',
    description:
      'The map updates in real-time. Flooded roads turn red, clear roads stay green. Ambulances, delivery drivers, and everyday commuters can plan safe routes without guessing.',
    color: 'bg-dark',
  },
];

const models = [
  {
    icon: Scan,
    name: 'RF-DETR',
    role: 'Object Detection',
    description:
      'An open-source transformer-based model used to detect water depth markers on vehicle tires and curb edges. It identifies how deep water has risen at each junction.',
  },
  {
    icon: Layers,
    name: 'Mask2Former',
    role: 'Segmentation',
    description:
      'An open-source segmentation model that audits road conditions after water recedes — spotting potholes, fallen debris, and damaged surfaces that could still be dangerous.',
  },
];

export default function AboutPage() {
  return (
    <div className="page-enter">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-forest/5 via-transparent to-amber/5" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-dark tracking-tight">
            How <span className="text-forest">FloodLens</span> Works
          </h1>
          <p className="mt-4 text-lg text-dark/60 max-w-2xl mx-auto">
            Three simple steps turn street cameras into a city-wide flood safety
            network.
          </p>
        </div>
      </section>

      {/* 3 Steps */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-sand hidden md:block" />

          <div className="space-y-12">
            {steps.map((step, i) => (
              <div key={i} className="relative flex items-start gap-6 md:gap-8">
                {/* Number + icon */}
                <div className="flex-shrink-0 relative z-10">
                  <div
                    className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center
                                shadow-lg transition-transform hover:scale-105`}
                  >
                    <step.icon className="w-7 h-7 text-cream" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-cream border-2 border-sand flex items-center justify-center text-xs font-bold text-dark">
                    {i + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="pt-2 flex-1">
                  <h3 className="text-xl font-bold text-dark mb-2">
                    {step.title}
                  </h3>
                  <p className="text-dark/60 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="bg-dark/[0.03] border-t border-sand/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-dark mb-2 text-center">
            Open-Source Vision Models
          </h2>
          <p className="text-dark/50 text-center mb-10">
            FloodLens is powered by cutting-edge, open-source computer vision
            research.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {models.map((model) => (
              <div
                key={model.name}
                className="p-6 rounded-2xl bg-white border border-sand/60 shadow-sm
                           hover:shadow-md hover:border-forest/30 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center">
                    <model.icon className="w-5 h-5 text-forest" />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark">{model.name}</h3>
                    <p className="text-xs text-dark/50">{model.role}</p>
                  </div>
                </div>
                <p className="text-sm text-dark/60 leading-relaxed">
                  {model.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="p-8 rounded-2xl bg-gradient-to-br from-forest/10 to-amber/10 border border-forest/20">
          <h2 className="text-2xl font-bold text-dark mb-2">
            Delhi deserves safer roads
          </h2>
          <p className="text-dark/60 mb-6">
            FloodLens is an open-source project. Help us monitor more roads and
            save more lives.
          </p>
          <a
            href="/map"
            className="inline-flex items-center gap-2 px-6 py-3 bg-forest text-cream rounded-xl
                       font-medium hover:bg-forest/90 transition-colors shadow-sm"
          >
            <Navigation className="w-4 h-4" />
            Explore the Map
          </a>
        </div>
      </section>
    </div>
  );
}
