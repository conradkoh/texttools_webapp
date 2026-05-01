import { MainLayout } from '@client/components/layouts/MainLayout';
import PdfParserPageTemplate from '@client/components/templates/PdfParserPageTemplate';
import React, { useState } from 'react';
import { FunctionComponent } from 'react';

interface PdfParserPageProps {}

const PdfParserPage: FunctionComponent<PdfParserPageProps> = () => {
  const [output, setOutput] = useState({ value: '' });

  return (
    <MainLayout title={'PDF Parser'}>
      <PdfParserPageTemplate output={output} setOutput={setOutput} />
    </MainLayout>
  );
};

export default PdfParserPage;
