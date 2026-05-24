"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiConsole } from "@/components/admin/api-console";

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-6 w-11 rounded-full transition-colors md:h-7 md:w-12 ${on ? "bg-nlng-blue" : "bg-zinc-600"}`}
      aria-pressed={on}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all md:top-1 md:h-5 md:w-5 ${on ? "right-0.5 md:right-1" : "left-0.5 md:left-1"}`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [push, setPush] = useState(true);

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-zinc-50 md:mb-6 md:text-2xl">Settings</h1>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alert thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm md:text-base">
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-300">Overspeed (km/h)</span>
              <Input className="w-24" defaultValue="90" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-300">Idle (minutes)</span>
              <Input className="w-24" defaultValue="12" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-300">Fuel drop (%)</span>
              <Input className="w-24" defaultValue="5" />
            </div>
            <Button size="sm" className="mt-2">
              Save thresholds
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm md:text-base">
            <div className="flex items-center justify-between border-b border-vms-border py-3">
              <span className="text-zinc-200">Email</span>
              <Toggle on={email} onToggle={() => setEmail((v) => !v)} />
            </div>
            <div className="flex items-center justify-between border-b border-vms-border py-3">
              <span className="text-zinc-200">SMS</span>
              <Toggle on={sms} onToggle={() => setSms((v) => !v)} />
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-zinc-200">Push</span>
              <Toggle on={push} onToggle={() => setPush((v) => !v)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User roles</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm md:text-base">
            <thead className="text-xs md:text-sm uppercase text-zinc-400">
              <tr>
                <th className="border-b border-vms-border py-3">User</th>
                <th className="border-b border-vms-border py-3">Role</th>
                <th className="border-b border-vms-border py-3">Locations</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["ops@nlng.local", "Ops Manager", "All sites"],
                ["hse@nlng.local", "HSE", "Bonny, PH"],
                ["finance@nlng.local", "Finance", "HQ"],
              ].map(([u, r, l]) => (
                <tr key={String(u)} className="hover:bg-vms-inset">
                  <td className="border-b border-vms-border py-3 font-medium text-zinc-100">{u}</td>
                  <td className="border-b border-vms-border py-3 text-zinc-200">{r}</td>
                  <td className="border-b border-vms-border py-3 text-zinc-400">{l}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hardware devices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm md:text-base">
          {[
            ["GPS / OBD", "Online", "98%"],
            ["Fuel sensor", "Degraded", "3 units"],
            ["DMS camera", "Online", "774 units"],
          ].map(([a, s, n]) => (
            <div key={String(a)} className="flex justify-between border-b border-vms-border py-3 last:border-0">
              <span className="font-medium text-zinc-100">{a}</span>
              <span className="text-zinc-300">{s}</span>
              <span className="text-zinc-400">{n}</span>
            </div>
          ))}
          <p className="pt-2 text-sm md:text-base text-zinc-400">
            API integrations: configure uctracking base URL and token in `.env.local` (see comments there).
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <ApiConsole
          title="Device management — Get device info"
          endpoint="/api/fleet/device-management/device-info"
          defaultParams={{ devIdno: "" }}
        />
        <ApiConsole
          title="Device management — Add device"
          endpoint="/api/fleet/device-management/device-add"
          defaultParams={{ devIdno: "", devType: "", factory: "", model: "", remark: "" }}
        />
        <ApiConsole
          title="Device management — Edit device"
          endpoint="/api/fleet/device-management/device-edit"
          defaultParams={{ devIdno: "", devType: "", factory: "", model: "", remark: "" }}
        />
        <ApiConsole title="Device management — Delete device" endpoint="/api/fleet/device-management/device-delete" defaultParams={{ devIdno: "" }} />
        <ApiConsole
          title="Vehicle management — Add vehicle"
          endpoint="/api/fleet/device-management/vehicle-add"
          defaultParams={{ vehIdno: "", devIdno: "", plateType: "", driverName: "", driverPhone: "" }}
        />
        <ApiConsole
          title="Vehicle management — Delete vehicle"
          endpoint="/api/fleet/device-management/vehicle-delete"
          defaultParams={{ vehIdno: "" }}
        />
        <ApiConsole
          title="Vehicle management — Install vehicle"
          endpoint="/api/fleet/device-management/install-vehicle"
          defaultParams={{ vehIdno: "", devIdno: "" }}
        />
        <ApiConsole
          title="Vehicle management — Uninstall device"
          endpoint="/api/fleet/device-management/uninstall-device"
          defaultParams={{ vehIdno: "", devIdno: "" }}
        />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <ApiConsole
          title="Driver management — driver of vehicle by device"
          endpoint="/api/fleet/driver-management/find-vehicle-driver-by-device"
          defaultParams={{ devIdno: "" }}
        />
        <ApiConsole
          title="Driver management — driver changed by device"
          endpoint="/api/fleet/driver-management/find-driver-changed-by-device"
          defaultParams={{ devIdno: "", lastUpdateTime: "" }}
        />
        <ApiConsole
          title="Driver management — find driver by license/work number"
          endpoint="/api/fleet/driver-management/find-driver-by-license"
          defaultParams={{ type: "1", content: "" }}
        />
        <ApiConsole
          title="Driver management — query punch card record"
          endpoint="/api/fleet/driver-management/query-punch-card"
          defaultParams={{
            vehIdno: "",
            dids: "",
            beginTime: "",
            endTime: "",
            toMap: "2",
            geoaddress: "1",
            currentPage: "1",
            pageRecords: "20",
          }}
        />
        <ApiConsole
          title="Driver management — query identify alarm"
          endpoint="/api/fleet/driver-management/query-identify-alarm"
          defaultParams={{
            vehIdno: "",
            dids: "",
            beginTime: "",
            endTime: "",
            toMap: "2",
            geoaddress: "1",
            currentPage: "1",
            pageRecords: "20",
          }}
        />
        <ApiConsole title="Driver management — query driver list" endpoint="/api/fleet/driver-management/query-driver-list" defaultParams={{ dName: "" }} />
        <ApiConsole
          title="Driver management — add/modify driver"
          endpoint="/api/fleet/driver-management/driver-merge"
          defaultParams={{
            id: "",
            jobNum: "",
            name: "",
            contact: "",
            cardNumber: "",
            sex: "",
            licenseNum: "",
            licenseType: "",
            birthPlace: "",
            startTime: "",
            validity: "",
            reminderDays: "",
            companyName: "",
            postId: "",
            remark: "",
            enable: "1",
          }}
        />
        <ApiConsole title="Driver management — find driver" endpoint="/api/fleet/driver-management/driver-load" defaultParams={{ id: "" }} />
        <ApiConsole title="Driver management — delete driver" endpoint="/api/fleet/driver-management/driver-delete" defaultParams={{ id: "" }} />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <ApiConsole
          title="SIM management — add/modify SIM"
          endpoint="/api/fleet/sim-management/sim-merge"
          defaultParams={{ id: "", cardNum: "", companyName: "", registrationTime: "", status: "1", remark: "", city: "", operator: "", devIdno: "" }}
        />
        <ApiConsole title="SIM management — find SIM" endpoint="/api/fleet/sim-management/sim-find" defaultParams={{ id: "" }} />
        <ApiConsole title="SIM management — delete SIM" endpoint="/api/fleet/sim-management/sim-delete" defaultParams={{ id: "" }} />
        <ApiConsole title="SIM management — query SIM (paged)" endpoint="/api/fleet/sim-management/sim-query" defaultParams={{ currentPage: "1", pageRecords: "20" }} />
        <ApiConsole title="SIM management — unbind SIM" endpoint="/api/fleet/sim-management/sim-unbind" defaultParams={{ flag: "0", id: "" }} />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <ApiConsole
          title="Organization management — New/merge organization"
          endpoint="/api/fleet/org/merge"
          defaultParams={{ name: "", account: "", parentId: "0", encryptPwd: "", password: "" }}
        />
        <ApiConsole title="Organization management — Find organization" endpoint="/api/fleet/org/find" defaultParams={{ id: "", name: "" }} />
        <ApiConsole title="Organization management — Delete organization" endpoint="/api/fleet/org/delete" defaultParams={{ id: "", name: "" }} />
        <ApiConsole
          title="Role management — Merge role"
          endpoint="/api/fleet/roles/merge"
          defaultParams={{ name: "", companyId: "", privilege: "" }}
        />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <ApiConsole title="Traffic — Get flow information" endpoint="/api/fleet/traffic/flow-info" defaultParams={{ devIdno: "" }} />
        <ApiConsole
          title="Traffic — Save flow configuration"
          endpoint="/api/fleet/traffic/flow-save"
          defaultParams={{
            devIdno: "",
            monitorOpen: "1",
            settlementDay: "1",
            monthLimit: "",
            monthRemindOpen: "1",
            dayLimit: "",
            dayRemindOpen: "1",
            dayRemind: "",
            overLimitOpen: "1",
          }}
        />
      </div>
    </div>
  );
}
