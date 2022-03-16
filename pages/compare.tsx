import { MainLayout } from '@client/components/layouts/MainLayout';
import SideNav from '@client/components/layouts/SideNav/SideNav';
import React from 'react';
import { FunctionComponent } from 'react';
interface ComparePageProps {}
const ComparePage: FunctionComponent<ComparePageProps> = (props) => {
  return (
    <MainLayout title={'Compare'}>
      <div>Compare</div>
    </MainLayout>
  );
};
export default ComparePage;
