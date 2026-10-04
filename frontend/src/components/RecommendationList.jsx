import React from 'react';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';

const RecommendationList = ({ recommendation }) => {
  if (!recommendation) return null;

  return (
    <div className="border rounded-xl p-5 bg-indigo-50 border-indigo-200 mt-6">
      <h3 className="text-xl font-bold text-indigo-900 mb-2">Personalized Match</h3>
      <p className="text-sm text-indigo-800 mb-4 opacity-80">How well this product matches your preferences</p>

      {!recommendation.isEligible && (
        <div className="bg-red-100 text-red-800 p-3 rounded-lg mb-4 text-sm font-bold flex items-center">
          <XCircle className="w-5 h-5 mr-2" />
          Excluded based on your strict exclusions
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-3 rounded-lg text-center shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase">SmartChoice</div>
          <div className="text-xl font-black text-gray-800">{recommendation.smartChoiceScore}/100</div>
        </div>
        <div className="bg-white p-3 rounded-lg text-center shadow-sm border-2 border-indigo-100">
          <div className="text-xs font-bold text-indigo-600 uppercase">Preferences</div>
          <div className="text-xl font-black text-indigo-700">{recommendation.personalization.score}/100</div>
        </div>
        <div className="bg-white p-3 rounded-lg text-center shadow-sm border-b-4 border-b-green-500">
          <div className="text-xs font-bold text-green-700 uppercase">Final Match</div>
          <div className="text-xl font-black text-green-700">{recommendation.finalScore}/100</div>
        </div>
      </div>

      <div className="space-y-2 text-sm bg-white p-4 rounded-lg shadow-sm">
        <h4 className="font-bold border-b pb-2 mb-2">Preference Details</h4>
        {recommendation.personalization.preferenceResults.length === 0 ? (
          <div className="text-gray-500 italic text-center py-2">No preferences set. Add preferences to see personalized details.</div>
        ) : (
          <ul className="space-y-2">
            {recommendation.personalization.preferenceResults.map((pref, i) => (
              <li key={i} className="flex items-start">
                {pref.status === 'MATCH' && <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 shrink-0" />}
                {pref.status === 'NO_MATCH' && <XCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 shrink-0" />}
                {pref.status === 'UNKNOWN' && <HelpCircle className="w-4 h-4 text-yellow-600 mr-2 mt-0.5 shrink-0" />}
                <span className="flex-1">
                  <span className="font-semibold mr-1">{pref.preference}:</span>
                  <span className="text-gray-600">{pref.reason}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default RecommendationList;
