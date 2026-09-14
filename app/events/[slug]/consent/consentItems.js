import { FaCamera } from 'react-icons/fa';
import { FaPeopleGroup, FaPerson, FaUserTag } from 'react-icons/fa6';

export const consentItems = [
  { key: 'generalPhotoConsent', label: 'General photos', Icon: FaCamera },
  { key: 'groupFaceConsent', label: 'Group photos', Icon: FaPeopleGroup },
  { key: 'otherFaceConsent', label: 'Other faces', Icon: FaPerson },
  { key: 'taggingConsent', label: 'Tagging', Icon: FaUserTag }
];

export default consentItems;
