import { usePageTitle } from '../hooks/usePageTitle';

/** Static education page: what CO2e means and how EcoTrace calculates. */
export default function Understand(): JSX.Element {
  usePageTitle('Understand your footprint');
  return (
    <>
      <h1>Understand your footprint</h1>

      <section aria-labelledby="what-is-co2e">
        <h2 id="what-is-co2e">What does "kg CO2e" mean?</h2>
        <p>
          CO2e — carbon dioxide equivalent — expresses the warming effect of all greenhouse gases
          (carbon dioxide, methane, nitrous oxide and others) as the amount of CO2 that would cause
          the same warming. It lets a car trip, a meal and a flight be compared on one scale. One kg
          CO2e from methane warms the planet as much as one kg CO2e from CO2.
        </p>
      </section>

      <section aria-labelledby="how-calculated">
        <h2 id="how-calculated">How EcoTrace calculates</h2>
        <p>
          Every activity you log is multiplied by an <strong>emission factor</strong> — the average
          kg CO2e produced per unit of that activity. For example, an average petrol car emits about
          0.192 kg CO2e per km, so a 10 km drive logs 1.9 kg CO2e. The calculation happens on the
          server, always from the same audited factor table, so the numbers are consistent
          everywhere in the app.
        </p>
      </section>

      <section aria-labelledby="where-factors">
        <h2 id="where-factors">Where the factors come from</h2>
        <ul>
          <li>
            <strong>Transport &amp; LPG:</strong> UK DEFRA greenhouse gas conversion factors (2024)
            — the most widely used public factor set.
          </li>
          <li>
            <strong>Electricity:</strong> Central Electricity Authority of India grid average
            (2023): about 0.82 kg CO2e per kWh.
          </li>
          <li>
            <strong>Food:</strong> Poore &amp; Nemecek (2018), <em>Science</em> — the largest
            meta-analysis of food system emissions.
          </li>
          <li>
            <strong>Shopping:</strong> manufacturer lifecycle reports (Apple, Dell) and UNEP
            estimates for garments.
          </li>
        </ul>
        <p>
          Factors are averages — your exact footprint depends on your specific car, grid and diet —
          but they are accurate enough to compare your own weeks and to find your biggest levers.
        </p>
      </section>

      <section aria-labelledby="why-track">
        <h2 id="why-track">Why tracking helps</h2>
        <p>
          The global average footprint is roughly 90 kg CO2e per person per week (Our World in Data,
          2023). Most personal emissions concentrate in a few repeated habits — a commute, a diet
          pattern, home energy. Tracking for even two weeks usually reveals one or two changes that
          remove kilograms per week, which the Insights page quantifies for you.
        </p>
      </section>
    </>
  );
}
