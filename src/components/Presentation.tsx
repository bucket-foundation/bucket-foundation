
export default function Presentation() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8  text-gray-200">
      {/* Welcome Section */}
      <section className="text-center mb-16">
        <h1 className="text-teal-400 text-7xl font-bold mb-2">Welcome to Bucket.Foundation</h1>
        <h2 className="text-white text-3xl mb-4">A Free-to-Read, Paid-to-Cite Research Platform</h2>
        <p className="max-w-2xl mx-auto text-lg mb-6">
          Bucket is revolutionizing access to research by eliminating high barriers. Our unique model allows curious individuals and independent researchers to explore knowledge without financial strain.
        </p>
        <p className="max-w-2xl mx-auto text-lg mb-6">
          With our free-to-read and paid-to-cite system, we aim to foster interdisciplinary collaboration and enhance the evolution of human thought.
        </p>
      </section>

      {/* Background Section */}
      <section className="mb-16 text-center">
        <h3 className="text-white text-4xl font-semibold mb-4">Background</h3>
        <p className="max-w-2xl mx-auto text-lg mb-6">
          Bucket.Foundation is an idea I’ve nurtured while pursuing my education and conducting independent research. The integration of an IP Management system was crucial, and Story provided the technology needed to bring this passion project to life.
        </p>
      </section>

      {/* Problem Section */}
      <section className="mb-16 text-center">
        <h3 className="text-white text-4xl font-semibold mb-4">The Problem</h3>
        <p className="max-w-2xl mx-auto text-lg mb-6">
          The research industry has high barriers to entry due to:
        </p>
        <ol className="list-decimal list-inside max-w-2xl mx-auto text-lg mb-6">
          <li>
            <strong>Expensive Access:</strong> Researchers pay publishers to publish and access their work, creating financial barriers that inhibit curious individuals and aspiring students.
          </li>
          <li>
            <strong>Complexity of Research Papers:</strong> Many papers are written for specific audiences, making them difficult for non-specialists to understand, leading to segmentation and limited interdisciplinary discussion.
          </li>
        </ol>
      </section>

      {/* Description Section */}
      <section className="mb-16 text-center">
        <h3 className="text-white text-4xl font-semibold mb-4">Our Solution</h3>
        <p className="max-w-2xl mx-auto text-lg mb-6">
          Bucket is a platform that offers free access to research and a paid citation model. We empower students, curious individuals, and independent researchers by fostering knowledge evolution.
        </p>
        <p className="max-w-2xl mx-auto text-lg mb-6">
          Our comprehensive research system will include a pre-publish peer-reviewing process and a citation market price calculator, with citations functioning as NFT tokens whose market value fluctuates based on various metrics.
        </p>
      </section>

      {/* Tools and Functionality Section */}
      <section className="mb-16 text-center">
        <h3 className="text-white text-4xl font-semibold mb-4">Tools and Functionality</h3>
        <p className="max-w-2xl mx-auto text-lg mb-6">
          Bucket utilizes a combination of tools to create a hybrid platform hosted on Vercel:
        </p>
        <ul className="list-disc list-inside max-w-2xl mx-auto text-lg mb-6">
          <li><strong>Story:</strong> For minting, registering, and managing research IP.</li>
          <li><strong>Walrus:</strong> For on-chain storage of research, NFTs, and IP data.</li>
          <li><strong>Dynamic:</strong> For user authentication and data management.</li>
          <li><strong>Supabase:</strong> For efficient data storage and retrieval of blockchain information.</li>
        </ul>
      </section>

      {/* User Experience Section */}
      <section className="mb-16 text-center">
        <h3 className="text-white text-4xl font-semibold mb-4">User Experience</h3>
        <p className="max-w-2xl mx-auto text-lg mb-6">
          The platform features several intuitive tabs:
        </p>
        <ul className="list-disc list-inside max-w-2xl mx-auto text-lg mb-6">
          <li><strong>Home Tab:</strong> Overview of the Bucket Platform.</li>
          <li><strong>Library Tab:</strong> Browse research IP assets, mint free noncommercial NFTs, and mint paid citation tokens.</li>
          <li><strong>Research Tab:</strong> Upload and manage research papers and citation tokens.</li>
          <li><strong>Assets Tab:</strong> Access all Story Protocol NFTs, including research IP assets and citation tokens.</li>
        </ul>
      </section>
    </div>
  );
}

