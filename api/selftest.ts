import { createArtifact } from './_artifact-engine.js';

const RELEASE = '1.9.3-autonomous-office-orchestrator';
const FORMATS = ['docx', 'xlsx', 'pptx'];

function isZipBuffer(buffer) {
  return Buffer.isBuffer(buffer) && buffer.length > 100 && buffer.subarray(0, 4).toString('hex') === '504b0304';
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });

  const result = {};
  for (const format of FORMATS) {
    try {
      const artifact = await createArtifact({
        format,
        title: `A.I Văn phòng ${format.toUpperCase()} self-test`,
        content: 'BÁO CÁO\nI. Nội dung kiểm thử\n- Artifact Engine nội bộ\n- Không phụ thuộc thư viện Office bên thứ ba\nTên;Giá trị\nQA;PASS'
      });
      result[format] = {
        pass: isZipBuffer(artifact.buffer),
        bytes: artifact.buffer.length,
        engine: 'internal-office-xml-v24'
      };
    } catch (error) {
      result[format] = { pass: false, error: String(error?.message || error).slice(0, 180) };
    }
  }

  const pass = Object.values(result).every((x) => x?.pass === true);
  return res.status(pass ? 200 : 500).json({
    pass,
    release: RELEASE,
    engine: 'internal-office-xml-v24',
    artifacts: result,
    timestamp: new Date().toISOString()
  });
}
