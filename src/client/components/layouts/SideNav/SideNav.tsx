import React from 'react';
import Link from 'next/link';
import { FunctionComponent } from 'react';
import Button from '@mui/material/Button';
interface SideNavProps {}
const SideNav: FunctionComponent<SideNavProps> = (props) => {
  return (
    <div>
      <div className="w-100 flex flex-row justify-center items-center">
        <div className="p-1">
          <article className="prose">
            <h1>TextTools</h1>
          </article>
        </div>
      </div>
      <div className="pt-3 px-3">
        <div className="font-bold text-gray-700 text-sm">Navigation</div>
      </div>
      <div className="py-1 px-3 flex justify-center">
        <Link href="/compare" passHref={true}>
          <Button variant="outlined" fullWidth={true} className="w-100">
            Compare
          </Button>
        </Link>
      </div>
    </div>
  );
};
export default SideNav;
