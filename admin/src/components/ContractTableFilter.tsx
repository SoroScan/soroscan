import React, { useState } from "react";
import { useDebounce } from "../hooks/useDebounce";

export interface Contract {
  id: string;
  name: string;
  network: string;
  status: "active" | "paused" | "unverified";
  registeredAt: string;
}

interface ContractTableFilterProps {
  contracts: Contract[];
}

/**
 * Search input plus the contract table it filters.
 *
 * The input keeps its own immediate `searchTerm` state so typing stays
 * responsive, while `useDebounce` delays the filtering state update by 300ms.
 * The table therefore only re-renders once the user stops typing.
 */
const ContractTableFilter: React.FC<ContractTableFilterProps> = ({
  contracts,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const normalizedTerm = debouncedSearchTerm.trim().toLowerCase();
  const filteredContracts = normalizedTerm
    ? contracts.filter((contract) =>
        [contract.name, contract.id, contract.network, contract.status].some(
          (field) => field.toLowerCase().includes(normalizedTerm),
        ),
      )
    : contracts;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="contract-search" className="sr-only">
          Search contracts
        </label>
        <input
          id="contract-search"
          type="search"
          data-testid="contract-search-input"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search contracts by name, ID, network, or status"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Contract ID
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Network
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Registered
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContracts.map((contract) => (
                <tr
                  key={contract.id}
                  data-testid={`contract-row-${contract.id}`}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {contract.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">
                    {contract.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contract.network}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">
                    {contract.status}
                  </td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {contract.registeredAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredContracts.length === 0 ? (
          <p
            data-testid="contract-filter-empty"
            className="px-6 py-4 text-sm text-gray-500"
          >
            No contracts match &ldquo;{debouncedSearchTerm}&rdquo;.
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ContractTableFilter;
