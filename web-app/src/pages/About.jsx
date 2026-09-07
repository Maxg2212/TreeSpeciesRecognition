export default function About() {
  return (
    <div>
      <p>
        Tree Identifier is a research project on leaf-based tree species
        recognition for Costa Rican tree species.
      </p>
      <p>
        In the field, the Tree Identifier mobile app classifies a photo of a
        leaf entirely on-device and records the predicted species together
        with the GPS coordinates and timestamp of the identification. This
        website is the dashboard for those results: it stores every
        identification attempt sent by the mobile app and, for each one,
        fetches a satellite view of the tree's canopy at those coordinates
        so the identification can be reviewed and verified.
      </p>
      <p>
        Browse past identifications on the <strong>History</strong> page.
      </p>
    </div>
  );
}
